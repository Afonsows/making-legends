import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Mission, TimeOfDay } from '../core/types';
import { PillarId, MissionRank } from '../theme/types';
import { shinobiTheme } from '../theme/shinobi.theme';
import { getTodayString } from '../core/streakEngine';
import { useUserStore } from './useUserStore';
import { useDuelStore } from './useDuelStore';
import { soundFx } from '../utils/audio';
import { triggerMissionConfetti } from '../utils/confetti';

export function getDefaultRyoReward(rank: MissionRank): number {
  switch (rank) {
    case 'E': return 10;
    case 'D': return 25;
    case 'C': return 50;
    case 'B': return 90;
    case 'A': return 160;
    case 'S': return 300;
    default: return 25;
  }
}

const initialMissions: Mission[] = [
  {
    id: 'mis_01',
    title: 'Despertar Sem Telas & Hidratação',
    description: 'Beber 500ml de água e passar 15 minutos sem redes sociais após acordar.',
    pillarId: 'chakra',
    rank: 'E',
    xpReward: 25,
    ryoReward: 10,
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
    ryoReward: 50,
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
    ryoReward: 25,
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
    ryoReward: 90,
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
    ryoReward: 25,
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
    ryoReward: 10,
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
}

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
      missions: initialMissions,
      filterPillar: 'all',
      filterTimeOfDay: 'all',
      searchQuery: '',

      setFilterPillar: (pillar) => set({ filterPillar: pillar }),
      setFilterTimeOfDay: (time) => set({ filterTimeOfDay: time }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleCompleteMission: (missionId: string) => {
        const { missions } = get();
        const mission = missions.find((m) => m.id === missionId);
        if (!mission) return;

        const todayStr = getTodayString();
        const willBeCompleted = !mission.isCompletedToday;
        const ryoAmount = mission.ryoReward || getDefaultRyoReward(mission.rank);
        const userStore = useUserStore.getState();

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

        set({ missions: updatedMissions });

        if (willBeCompleted) {
          // Toca som e confetes
          soundFx.playMissionComplete();
          triggerMissionConfetti();

          // Adiciona XP e Ryō no perfil do usuário
          const { finalXp } = userStore.addXp(mission.xpReward, mission.pillarId);
          userStore.addRyo(ryoAmount);

          // Causa dano no Boss do Modo Duelo
          const duelStore = useDuelStore.getState();
          const equippedItems = userStore.getEquippedItems();
          duelStore.dealDamageFromMission(finalXp, mission.pillarId, equippedItems);
        } else {
          // Desmarcou a missão: retira o XP e o Ryō concedidos
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
          ryoReward: missionData.ryoReward || getDefaultRyoReward(missionData.rank),
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
          missions: missions.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        });
      },

      deleteMission: (id) => {
        const { missions } = get();
        set({
          missions: missions.filter((m) => m.id !== id),
        });
      },

      resetDailyMissionsIfNewDay: () => {
        const { missions } = get();
        const todayStr = getTodayString();

        const updated = missions.map((m) => ({
          ...m,
          isCompletedToday: m.completedDates.includes(todayStr),
        }));

        set({ missions: updated });
      },

      setCustomMissionList: (newMissions) => {
        set({ missions: newMissions });
      },
    }),
    {
      name: 'shinobi_habit_store_v1',
    }
  )
);
