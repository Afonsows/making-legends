import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Mission, MissionLogEntry, TimeOfDay } from '../core/types';
import { PillarId, MissionRank } from '../theme/types';
import { shinobiTheme } from '../theme/shinobi.theme';
import { getTodayString, isValidDateString } from '../core/dateUtils';
import { getDefaultRyoReward, calculateRyoGainWithBuffs } from '../core/ryoEngine';
import { useUserStore } from './useUserStore';
import { syncService } from '../services/syncService';
import { soundFx } from '../utils/audio';
import { triggerMissionConfetti } from '../utils/confetti';
import { buildDayRecord } from '../core/streakEngine';

export { getDefaultRyoReward, calculateRyoGainWithBuffs };

export function getRankRewards(rank: MissionRank): { xp: number; ryo: number } {
  const info = shinobiTheme.missionRanks[rank] || shinobiTheme.missionRanks.D;
  return { xp: info.xpReward, ryo: info.ryoReward || getDefaultRyoReward(rank) };
}

const mk = (
  id: string,
  title: string,
  description: string,
  pillarId: PillarId,
  rank: MissionRank,
  timeOfDay: TimeOfDay,
  order: number
): Mission => ({
  id,
  title,
  description,
  pillarId,
  rank,
  xpReward: getRankRewards(rank).xp,
  ryoReward: getRankRewards(rank).ryo,
  timeOfDay,
  isCompletedToday: false,
  completedDates: [],
  isCustom: false,
  order,
  createdAt: new Date().toISOString(),
});

export const initialMissions: Mission[] = [
  mk('mis_01', 'Despertar Sem Telas & Hidratação', 'Beber 500ml de água e passar 15 minutos sem redes sociais após acordar.', 'chakra', 'E', 'morning', 1),
  mk('mis_02', 'Treinamento de Taijutsu (Corpo)', '30 a 45 minutos de treino de força, corrida ou calistenia com postura correta.', 'taijutsu', 'C', 'morning', 2),
  mk('mis_03', 'Estudo dos Pergaminhos (Ninjutsu)', 'Ler 10 a 20 páginas de um livro de não-ficção ou estudo técnico com anotações.', 'ninjutsu', 'D', 'afternoon', 3),
  mk('mis_04', 'Sessão de Foco Profundo (Genjutsu)', '45 minutos de trabalho focado com celular em outro cômodo e zero abas inúteis.', 'genjutsu', 'B', 'afternoon', 4),
  mk('mis_05', 'Ato de Coragem (Espírito)', 'Resolver a tarefa mais desconfortável da lista sem procrastinar.', 'espirito', 'D', 'evening', 5),
  mk('mis_06', 'Desligamento Noturno & Preparação', 'Ajustar as missões de amanhã e desligar aparelhos 30 minutos antes do descanso.', 'chakra', 'E', 'evening', 6),
];

/** Normaliza datas, recompensas e o status de hoje de uma missão. */
function sanitizeMission(m: Mission, todayStr: string): Mission {
  const validDates = Array.from(
    new Set((m.completedDates || []).filter((d) => isValidDateString(d) && d <= todayStr))
  ).sort();
  const rewards = getRankRewards(m.rank);
  return {
    ...m,
    xpReward: m.xpReward > 0 ? m.xpReward : rewards.xp,
    ryoReward: m.ryoReward && m.ryoReward > 0 ? m.ryoReward : rewards.ryo,
    timeOfDay: m.timeOfDay || 'anytime',
    completedDates: validDates,
    isCompletedToday: validDates.includes(todayStr),
  };
}

export const missionGrantKey = (missionId: string, date: string) => `mission:${missionId}:${date}`;

interface HabitStoreState {
  missions: Mission[];
  missionLogs: MissionLogEntry[];
  filterPillar: PillarId | 'all';
  filterTimeOfDay: TimeOfDay | 'all';
  searchQuery: string;
  lastCompletion: { id: string; at: number } | null;

  setFilterPillar: (pillar: PillarId | 'all') => void;
  setFilterTimeOfDay: (time: TimeOfDay | 'all') => void;
  setSearchQuery: (query: string) => void;

  toggleCompleteMission: (missionId: string) => void;
  /** Marca uma missão em uma data já ocorrida, sem conceder recompensa retroativa. */
  toggleMissionOnDate: (missionId: string, date: string) => { success: boolean; isCompleted: boolean; reason?: string };
  completeAllMissionsToday: () => void;
  uncompleteAllMissionsToday: () => void;
  addMission: (mission: Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  resetDailyMissionsIfNewDay: () => void;
  setCustomMissionList: (missions: Mission[]) => void;
  reorderMissions: (newMissions: Mission[]) => void;
  moveMission: (missionId: string, direction: 'up' | 'down', visibleIds?: string[]) => void;

  addMissionLog: (log: MissionLogEntry) => void;
  clearLogs: () => void;
  recalibrateFromMissions: () => { totalXp: number; level: number; ryo: number };
}

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => {
      const log = (mission: Mission, xp: number, ryo: number, action: MissionLogEntry['action']) => {
        const entry: MissionLogEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          missionId: mission.id,
          missionTitle: mission.title,
          pillarId: mission.pillarId,
          rank: mission.rank,
          xp,
          ryo,
          action,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ missionLogs: [entry, ...state.missionLogs].slice(0, 150) }));
      };

      /** Estorna a recompensa de hoje de uma missão (usado ao desmarcar, editar rank ou excluir). */
      const revertTodayReward = (mission: Mission) => {
        const userStore = useUserStore.getState();
        const key = missionGrantKey(mission.id, getTodayString());
        const grant = userStore.revokeReward(key);
        if (grant) {
          log(mission, -grant.xp, -grant.ryo, 'reverted');
          return;
        }
        // Conclusão vinda de outro aparelho (sem registro local): estorna o valor base.
        const base = getRankRewards(mission.rank);
        const xp = mission.xpReward || base.xp;
        const ryo = mission.ryoReward || base.ryo;
        userStore.adjustProgress(-xp, -ryo, mission.pillarId);
        log(mission, -xp, -ryo, 'reverted');
      };

      return {
        missions: initialMissions,
        missionLogs: [],
        filterPillar: 'all',
        filterTimeOfDay: 'all',
        searchQuery: '',
        lastCompletion: null,

        setFilterPillar: (pillar) => set({ filterPillar: pillar }),
        setFilterTimeOfDay: (time) => set({ filterTimeOfDay: time }),
        setSearchQuery: (query) => set({ searchQuery: query }),

        toggleCompleteMission: (missionId) => {
          // Garante que o dia virou antes de registrar (app aberto após a meia-noite)
          useUserStore.getState().checkDayTransition();

          const mission = get().missions.find((m) => m.id === missionId);
          if (!mission) return;
          const todayStr = getTodayString();
          const willBeCompleted = !(mission.completedDates || []).includes(todayStr);

          set((state) => ({
            missions: state.missions.map((m) => {
              if (m.id !== missionId) return m;
              const completedDates = willBeCompleted
                ? Array.from(new Set([...(m.completedDates || []), todayStr])).sort()
                : (m.completedDates || []).filter((d) => d !== todayStr);
              return { ...m, completedDates, isCompletedToday: willBeCompleted };
            }),
            lastCompletion: willBeCompleted ? { id: missionId, at: Date.now() } : state.lastCompletion,
          }));

          const userStore = useUserStore.getState();
          if (willBeCompleted) {
            soundFx.playMissionComplete();
            triggerMissionConfetti();
            const base = getRankRewards(mission.rank);
            const grant = userStore.grantReward({
              key: missionGrantKey(mission.id, todayStr),
              label: mission.title,
              baseXp: mission.xpReward || base.xp,
              baseRyo: mission.ryoReward || base.ryo,
              pillarId: mission.pillarId,
              dealDamage: true,
            });
            if (grant) {
              log(mission, grant.xp, grant.ryo, 'completed');
              userStore.updateProfile({ missionsCompletedTotal: (userStore.profile.missionsCompletedTotal || 0) + 1 });
            }
          } else {
            soundFx.playMissionUndo();
            revertTodayReward(mission);
            const p = useUserStore.getState().profile;
            useUserStore.getState().updateProfile({ missionsCompletedTotal: Math.max(0, (p.missionsCompletedTotal || 0) - 1) });
          }

          useUserStore.getState().refreshToday();
        },

        toggleMissionOnDate: (missionId, date) => {
          const todayStr = getTodayString();
          const mission = get().missions.find((m) => m.id === missionId);
          if (!mission || !isValidDateString(date) || date > todayStr) {
            return { success: false, isCompleted: false, reason: 'Escolha uma data válida que não esteja no futuro.' };
          }
          if (date === todayStr) {
            get().toggleCompleteMission(missionId);
            return { success: true, isCompleted: Boolean(get().missions.find((m) => m.id === missionId)?.isCompletedToday) };
          }

          const willBeCompleted = !(mission.completedDates || []).includes(date);
          set((state) => ({
            missions: state.missions.map((m) => {
              if (m.id !== missionId) return m;
              const completedDates = willBeCompleted
                ? Array.from(new Set([...(m.completedDates || []), date])).sort()
                : (m.completedDates || []).filter((d) => d !== date);
              return { ...m, completedDates };
            }),
          }));

          const user = useUserStore.getState();
          const record = buildDayRecord(get().missions, date, true, user.profile.dayLog[date]);
          user.updateProfile({ dayLog: { ...user.profile.dayLog, [date]: record } });
          user.refreshToday({ silent: true });
          return { success: true, isCompleted: willBeCompleted };
        },

        completeAllMissionsToday: () => {
          const pending = get().missions.filter((m) => !m.isCompletedToday);
          if (pending.length === 0) return;
          pending.forEach((m) => {
            get().toggleCompleteMission(m.id);
          });
        },

        uncompleteAllMissionsToday: () => {
          const completed = get().missions.filter((m) => m.isCompletedToday);
          if (completed.length === 0) return;
          completed.forEach((m) => {
            get().toggleCompleteMission(m.id);
          });
        },

        addMission: (missionData) => {
          const rewards = getRankRewards(missionData.rank);
          const newMission: Mission = {
            ...missionData,
            id: `mis_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            xpReward: rewards.xp,
            ryoReward: rewards.ryo,
            isCompletedToday: false,
            completedDates: [],
            order: get().missions.length + 1,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ missions: [...state.missions, newMission] }));
          soundFx.playScrollOpen();
          useUserStore.getState().refreshToday({ silent: true });
        },

        updateMission: (id, updates) => {
          const before = get().missions.find((m) => m.id === id);
          if (!before) return;
          const newRank = updates.rank || before.rank;
          const rankChanged = newRank !== before.rank;
          const rewards = getRankRewards(newRank);
          const pillarChanged = updates.pillarId !== undefined && updates.pillarId !== before.pillarId;

          // Se a recompensa de hoje muda, estorna o valor antigo e concede o novo.
          const completedToday = (before.completedDates || []).includes(getTodayString());
          if (completedToday && (rankChanged || pillarChanged)) revertTodayReward(before);

          set((state) => ({
            missions: state.missions.map((m) =>
              m.id === id
                ? {
                    ...m,
                    ...updates,
                    rank: newRank,
                    xpReward: rankChanged ? rewards.xp : m.xpReward || rewards.xp,
                    ryoReward: rankChanged ? rewards.ryo : m.ryoReward || rewards.ryo,
                    completedDates: m.completedDates,
                    isCompletedToday: m.isCompletedToday,
                  }
                : m
            ),
          }));

          if (completedToday && (rankChanged || pillarChanged)) {
            const after = get().missions.find((m) => m.id === id)!;
            const grant = useUserStore.getState().grantReward({
              key: missionGrantKey(after.id, getTodayString()),
              label: after.title,
              baseXp: after.xpReward,
              baseRyo: after.ryoReward || rewards.ryo,
              pillarId: after.pillarId,
              dealDamage: true,
            });
            if (grant) log(after, grant.xp, grant.ryo, 'completed');
          }
          useUserStore.getState().refreshToday({ silent: true });
        },

        deleteMission: (id) => {
          const mission = get().missions.find((m) => m.id === id);
          if (!mission) return;
          if ((mission.completedDates || []).includes(getTodayString())) revertTodayReward(mission);
          set((state) => ({
            missions: state.missions.filter((m) => m.id !== id).map((m, idx) => ({ ...m, order: idx + 1 })),
          }));
          syncService.deleteMission(id);
          useUserStore.getState().refreshToday({ silent: true });
        },

        resetDailyMissionsIfNewDay: () => {
          const todayStr = getTodayString();
          set((state) => ({ missions: state.missions.map((m) => sanitizeMission(m, todayStr)) }));
        },

        setCustomMissionList: (newMissions) => {
          const todayStr = getTodayString();
          set({
            missions: newMissions.map((m, idx) => sanitizeMission({ ...m, order: m.order || idx + 1 }, todayStr)),
          });
        },

        reorderMissions: (newMissions) => {
          set({ missions: newMissions.map((m, idx) => ({ ...m, order: idx + 1 })) });
        },

        /**
         * Move a missão uma posição entre as missões VISÍVEIS (ex.: só as pendentes),
         * trocando de lugar com a vizinha visível na lista completa.
         */
        moveMission: (missionId, direction, visibleIds) => {
          const missions = [...get().missions];
          const visible = visibleIds && visibleIds.length ? visibleIds : missions.map((m) => m.id);
          const pos = visible.indexOf(missionId);
          const neighborId = visible[direction === 'up' ? pos - 1 : pos + 1];
          if (pos === -1 || !neighborId) return;
          const a = missions.findIndex((m) => m.id === missionId);
          const b = missions.findIndex((m) => m.id === neighborId);
          [missions[a], missions[b]] = [missions[b], missions[a]];
          set({ missions: missions.map((m, idx) => ({ ...m, order: idx + 1 })) });
        },

        addMissionLog: (entry) => set((state) => ({ missionLogs: [entry, ...state.missionLogs].slice(0, 150) })),
        clearLogs: () => set({ missionLogs: [] }),

        /**
         * Verificação de integridade NÃO destrutiva: normaliza missões e recalcula
         * nível, patente, sequência e inventário a partir dos dados existentes.
         */
        recalibrateFromMissions: () => {
          get().resetDailyMissionsIfNewDay();
          const userStore = useUserStore.getState();
          userStore.syncInventory();
          userStore.adjustProgress(0, 0);
          userStore.refreshToday({ silent: true });
          const p = useUserStore.getState().profile;
          return { totalXp: p.totalXp, level: p.level, ryo: p.ryo };
        },
      };
    },
    {
      name: 'shinobi_habit_store_v1',
      version: 2,
      partialize: (state) =>
        ({ missions: state.missions, missionLogs: state.missionLogs }) as unknown as HabitStoreState,
      migrate: (persisted) => persisted as HabitStoreState,
      merge: (persisted, current) => {
        const saved = (persisted || {}) as Partial<HabitStoreState>;
        const todayStr = getTodayString();
        const missions = Array.isArray(saved.missions) ? saved.missions : current.missions;
        return {
          ...current,
          missions: missions.map((m) => sanitizeMission(m, todayStr)),
          missionLogs: Array.isArray(saved.missionLogs) ? saved.missionLogs : [],
        };
      },
    }
  )
);
