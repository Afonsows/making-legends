import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Mission, MissionLogEntry, TimeOfDay } from '../core/types';
import { PillarId, MissionRank } from '../theme/types';
import { shinobiTheme } from '../theme/shinobi.theme';
import { getTodayString } from '../core/streakEngine';
import { getLevelFromTotalXp, getRankIdFromLevel } from '../core/xpEngine';
import { getDefaultRyoReward, calculateRyoGainWithBuffs } from '../core/ryoEngine';
import { useUserStore } from './useUserStore';
import { useDuelStore } from './useDuelStore';
import { syncService } from '../services/syncService';
import { soundFx } from '../utils/audio';
import { triggerMissionConfetti } from '../utils/confetti';

export { getDefaultRyoReward, calculateRyoGainWithBuffs };

const initialMissions: Mission[] = [
  {
    id: 'mis_01',
    title: 'Despertar Sem Telas & Hidratação',
    description: 'Beber 500ml de água e passar 15 minutos sem redes sociais após acordar.',
    pillarId: 'chakra',
    rank: 'E',
    xpReward: 25,
    ryoReward: 15,
    timeOfDay: 'morning',
    isCompletedToday: false,
    completedDates: [],
    isCustom: false,
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mis_02',
    title: 'Treinamento de Taijutsu (Corpo)',
    description: '30 a 45 minutos de treino de força, corrida ou calistenia com postura correta.',
    pillarId: 'taijutsu',
    rank: 'C',
    xpReward: 85,
    ryoReward: 70,
    timeOfDay: 'morning',
    isCompletedToday: false,
    completedDates: [],
    isCustom: false,
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mis_03',
    title: 'Estudo dos Pergaminhos (Ninjutsu)',
    description: 'Ler 10 a 20 páginas de um livro de não-ficção ou estudo técnico com anotações.',
    pillarId: 'ninjutsu',
    rank: 'D',
    xpReward: 50,
    ryoReward: 35,
    timeOfDay: 'afternoon',
    isCompletedToday: false,
    completedDates: [],
    isCustom: false,
    order: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mis_04',
    title: 'Sessão de Deep Work (Genjutsu)',
    description: '45 minutos de trabalho focado com celular em outro cômodo e zero abas inúteis.',
    pillarId: 'genjutsu',
    rank: 'B',
    xpReward: 140,
    ryoReward: 130,
    timeOfDay: 'afternoon',
    isCompletedToday: false,
    completedDates: [],
    isCustom: false,
    order: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mis_05',
    title: 'Ato de Coragem e Superação (Espírito)',
    description: 'Resolver a tarefa mais desconfortável da lista sem procrastinar.',
    pillarId: 'espirito',
    rank: 'D',
    xpReward: 50,
    ryoReward: 35,
    timeOfDay: 'evening',
    isCompletedToday: false,
    completedDates: [],
    isCustom: false,
    order: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mis_06',
    title: 'Desligamento Noturno & Preparação',
    description: 'Ajustar as missões de amanhã e desligar aparelhos 30 minutos antes do descanso.',
    pillarId: 'chakra',
    rank: 'E',
    xpReward: 25,
    ryoReward: 15,
    timeOfDay: 'evening',
    isCompletedToday: false,
    completedDates: [],
    isCustom: false,
    order: 6,
    createdAt: new Date().toISOString(),
  },
];

interface HabitStoreState {
  missions: Mission[];
  missionLogs: MissionLogEntry[];
  filterPillar: PillarId | 'all';
  filterTimeOfDay: TimeOfDay | 'all';
  searchQuery: string;

  // Actions
  setFilterPillar: (pillar: PillarId | 'all') => void;
  setFilterTimeOfDay: (time: TimeOfDay | 'all') => void;
  setSearchQuery: (query: string) => void;
  
  // Mission CRUD
  toggleCompleteMission: (missionId: string) => void;
  addMission: (mission: Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  resetDailyMissionsIfNewDay: () => void;
  setCustomMissionList: (missions: Mission[]) => void;
  reorderMissions: (newMissions: Mission[]) => void;
  moveMission: (missionId: string, direction: 'up' | 'down') => void;
  
  // Logs & Reconcile
  addMissionLog: (log: MissionLogEntry) => void;
  clearLogs: () => void;
  recalibrateFromMissions: () => { totalXp: number; level: number; ryo: number };
}

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
      missions: initialMissions,
      missionLogs: [],
      filterPillar: 'all',
      filterTimeOfDay: 'all',
      searchQuery: '',

      setFilterPillar: (pillar) => set({ filterPillar: pillar }),
      setFilterTimeOfDay: (time) => set({ filterTimeOfDay: time }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleCompleteMission: (missionId: string) => {
        const { missions, missionLogs } = get();
        const mission = missions.find((m) => m.id === missionId);
        if (!mission) return;

        const todayStr = getTodayString();
        const willBeCompleted = !mission.isCompletedToday;
        const userStore = useUserStore.getState();
        const equippedItems = userStore.getEquippedItems();

        const baseRyo = mission.ryoReward || getDefaultRyoReward(mission.rank);
        const { finalRyo } = calculateRyoGainWithBuffs(
          baseRyo,
          userStore.profile.currentStreak,
          userStore.profile.level,
          equippedItems
        );
        const ryoAmount = finalRyo;

        const updatedMissions = missions.map((m) => {
          if (m.id === missionId) {
            const completedDates = willBeCompleted
              ? Array.from(new Set([...m.completedDates, todayStr]))
              : m.completedDates.filter((d) => d !== todayStr);

            return {
              ...m,
              isCompletedToday: willBeCompleted,
              completedDates,
            };
          }
          return m;
        });

        // Cria o registro no histórico de missões
        const newLogEntry: MissionLogEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          missionId: mission.id,
          missionTitle: mission.title,
          pillarId: mission.pillarId,
          rank: mission.rank,
          xp: willBeCompleted ? mission.xpReward : -mission.xpReward,
          ryo: willBeCompleted ? ryoAmount : -ryoAmount,
          action: willBeCompleted ? 'completed' : 'reverted',
          createdAt: new Date().toISOString(),
        };

        set({ 
          missions: updatedMissions,
          missionLogs: [newLogEntry, ...missionLogs].slice(0, 100), // Mantém os últimos 100 registros
        });

        if (willBeCompleted) {
          soundFx.playMissionComplete();
          triggerMissionConfetti();

          const { finalXp } = userStore.addXp(mission.xpReward, mission.pillarId);
          userStore.addRyo(ryoAmount);

          const duelStore = useDuelStore.getState();
          duelStore.dealDamageFromMission(finalXp, mission.pillarId, equippedItems);
        } else {
          userStore.removeXp(mission.xpReward, mission.pillarId);
          userStore.removeRyo(ryoAmount);
        }
      },

      addMission: (missionData) => {
        const { missions } = get();
        const rankInfo = shinobiTheme.missionRanks[missionData.rank] || shinobiTheme.missionRanks.D;
        
        const newMission: Mission = {
          ...missionData,
          id: `mis_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          xpReward: missionData.xpReward || rankInfo.xpReward,
          ryoReward: missionData.ryoReward || rankInfo.ryoReward || getDefaultRyoReward(missionData.rank),
          isCompletedToday: false,
          completedDates: [],
          order: missions.length + 1,
          createdAt: new Date().toISOString(),
        };

        set({ missions: [...missions, newMission] });
      },

      updateMission: (id, updates) => {
        const { missions } = get();
        set({
          missions: missions.map((m) => {
            if (m.id !== id) return m;
            const newRank = updates.rank || m.rank;
            const rankInfo = shinobiTheme.missionRanks[newRank] || shinobiTheme.missionRanks.D;
            const newXpReward = updates.xpReward ?? (updates.rank ? rankInfo.xpReward : m.xpReward);
            const newRyoReward = updates.ryoReward ?? (updates.rank ? (rankInfo.ryoReward || getDefaultRyoReward(newRank)) : (m.ryoReward || getDefaultRyoReward(newRank)));
            return {
              ...m,
              ...updates,
              xpReward: newXpReward,
              ryoReward: newRyoReward,
            };
          }),
        });
      },

      deleteMission: (id) => {
        const { missions } = get();
        const mission = missions.find((m) => m.id === id);
        if (!mission) return;

        // Se a missão estava concluída hoje, reverte os ganhos de XP e Ryō
        if (mission.isCompletedToday) {
          const userStore = useUserStore.getState();
          const ryoAmount = mission.ryoReward || getDefaultRyoReward(mission.rank);
          userStore.removeXp(mission.xpReward, mission.pillarId);
          userStore.removeRyo(ryoAmount);
        }

        const remainingMissions = missions.filter((m) => m.id !== id);
        set({
          missions: remainingMissions,
        });

        // Deleta imediatamente da nuvem (Supabase)
        syncService.deleteMission(id);
      },

      resetDailyMissionsIfNewDay: () => {
        const { missions } = get();
        const todayStr = getTodayString();

        const updated = missions.map((m) => {
          const completedDates = m.completedDates || [];
          const isCompletedToday = completedDates.includes(todayStr);
          return {
            ...m,
            completedDates,
            isCompletedToday,
          };
        });

        set({ missions: updated });
      },

      setCustomMissionList: (newMissions) => {
        const todayStr = getTodayString();
        const sanitized = newMissions.map((m) => {
          const completedDates = m.completedDates || [];
          return {
            ...m,
            completedDates,
            isCompletedToday: completedDates.includes(todayStr),
          };
        });
        set({ missions: sanitized });
      },

      reorderMissions: (newMissions) => {
        const withOrder = newMissions.map((m, idx) => ({ ...m, order: idx + 1 }));
        set({ missions: withOrder });
      },

      moveMission: (missionId, direction) => {
        const { missions } = get();
        const index = missions.findIndex((m) => m.id === missionId);
        if (index === -1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= missions.length) return;

        const newMissions = [...missions];
        const [removed] = newMissions.splice(index, 1);
        newMissions.splice(targetIndex, 0, removed);

        const withOrder = newMissions.map((m, idx) => ({ ...m, order: idx + 1 }));
        set({ missions: withOrder });
      },

      addMissionLog: (log) => {
        set((state) => ({
          missionLogs: [log, ...state.missionLogs].slice(0, 100),
        }));
      },

      clearLogs: () => {
        set({ missionLogs: [] });
      },

      recalibrateFromMissions: () => {
        const { missions } = get();
        const userStore = useUserStore.getState();

        let totalCalculatedXp = 0;
        let totalCalculatedRyo = 0;
        const pillarXpMap: Record<PillarId, number> = {
          taijutsu: 0,
          ninjutsu: 0,
          chakra: 0,
          espirito: 0,
          genjutsu: 0,
        };

        missions.forEach((m) => {
          if (m.isCompletedToday) {
            totalCalculatedXp += m.xpReward;
            totalCalculatedRyo += m.ryoReward || getDefaultRyoReward(m.rank);
            pillarXpMap[m.pillarId] = (pillarXpMap[m.pillarId] || 0) + m.xpReward;
          }
        });

        const newLevel = getLevelFromTotalXp(totalCalculatedXp);
        const newRank = getRankIdFromLevel(newLevel);

        const syncLog: MissionLogEntry = {
          id: `log_sync_${Date.now()}`,
          missionId: 'recalibrate',
          missionTitle: 'Recalibração & Sincronização de Ficha',
          pillarId: 'chakra',
          rank: 'E',
          xp: totalCalculatedXp,
          ryo: totalCalculatedRyo,
          action: 'synced',
          createdAt: new Date().toISOString(),
        };

        userStore.updateProfile({
          totalXp: totalCalculatedXp,
          level: newLevel,
          currentRankId: newRank,
          ryo: totalCalculatedRyo,
          pillarXp: pillarXpMap,
        });

        set((state) => ({
          missionLogs: [syncLog, ...state.missionLogs].slice(0, 100),
        }));

        return { totalXp: totalCalculatedXp, level: newLevel, ryo: totalCalculatedRyo };
      },
    }),
    {
      name: 'shinobi_habit_store_v1',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const todayStr = getTodayString();
          state.missions = (state.missions || []).map((m) => {
            const completedDates = m.completedDates || [];
            return {
              ...m,
              completedDates,
              isCompletedToday: completedDates.includes(todayStr),
            };
          });
        }
      },
    }
  )
);
