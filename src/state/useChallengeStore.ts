import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserChallenge, ChallengeHabit, UserProfile, Mission } from '../core/types';
import { PillarId } from '../theme/types';
import { getTodayString } from '../core/streakEngine';
import { soundFx } from '../utils/audio';
import { triggerMissionConfetti } from '../utils/confetti';
import { useUserStore } from './useUserStore';
import { useHabitStore } from './useHabitStore';

export interface DayStripInfo {
  date: string; // YYYY-MM-DD
  dayNumber: number; // dia do mês (ex: 29, 31)
  weekdayLabel: string; // 'D' | 'S' | 'T' | 'Q' | 'Q' | 'S' | 'S' | 'HOJE'
  isToday: boolean;
  isCompleted: boolean;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
  isToday: boolean;
  isInFuture: boolean;
  dayOfWeek: number; // 0 (Dom) a 6 (Sáb)
}

export interface ChallengeGridDay {
  dayNumber: number; // 1 .. targetDays
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
  isToday: boolean;
  isPast: boolean;
  isInFuture: boolean;
}

/**
 * Gera a lista exata de dias correspondente à duração total do desafio proposto (ex: 66 quadrinhos para 66 dias).
 */
export function generateChallengeDays(
  targetDays: number = 66,
  startDate?: string,
  completedDates: string[] = []
): ChallengeGridDay[] {
  const result: ChallengeGridDay[] = [];
  const todayStr = getTodayString();
  const start = startDate ? new Date(startDate + 'T00:00:00') : new Date();

  const completedSet = new Set(completedDates || []);

  for (let i = 1; i <= targetDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + (i - 1));

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isInFuture = dateStr > todayStr;
    const isCompleted = completedSet.has(dateStr);

    result.push({
      dayNumber: i,
      date: dateStr,
      isCompleted,
      isToday,
      isPast,
      isInFuture,
    });
  }

  return result;
}

/**
 * Retorna os últimos 7 dias até a data de hoje.
 */
export function getRecent7Days(completedDates: string[] = []): DayStripInfo[] {
  const result: DayStripInfo[] = [];
  const todayStr = getTodayString();
  const todayDate = new Date();
  
  const weekdayShortNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // Dom, Seg, Ter, Qua, Qui, Sex, Sáb

  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const isToday = i === 0 || dateStr === todayStr;
    const weekdayIdx = d.getDay();
    const weekdayLabel = isToday ? 'HOJE' : weekdayShortNames[weekdayIdx];
    const isCompleted = completedDates.includes(dateStr);

    result.push({
      date: dateStr,
      dayNumber: d.getDate(),
      weekdayLabel,
      isToday,
      isCompleted,
    });
  }

  return result;
}

/**
 * Calcula a ofensiva atual e o recorde histórico para uma lista de datas concluídas.
 */
export function calculateHabitStreaks(completedDates: string[] = []): { currentStreak: number; bestStreak: number } {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const uniqueDates = Array.from(new Set(completedDates)).sort();
  const todayStr = getTodayString();
  const todayDate = new Date();
  
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(todayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  // 1. Cálculo da melhor sequência histórica
  let bestStreak = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dateStr of uniqueDates) {
    const currDate = new Date(dateStr + 'T00:00:00');
    if (prevDate) {
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    } else {
      currentRun = 1;
    }
    if (currentRun > bestStreak) {
      bestStreak = currentRun;
    }
    prevDate = currDate;
  }

  // 2. Cálculo da sequência atual contínua até hoje ou ontem
  let currentStreak = 0;
  let checkDate = new Date(todayDate);

  // Se não fez hoje, verifica se fez ontem para manter a ofensiva viva
  if (!uniqueDates.includes(todayStr)) {
    if (uniqueDates.includes(yesterdayStr)) {
      checkDate = yesterdayDate;
    } else {
      return { currentStreak: 0, bestStreak: Math.max(bestStreak, 0) };
    }
  }

  // Conta os dias consecutivos regressivamente
  while (true) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${d}`;

    if (uniqueDates.includes(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
  };
}

/**
 * Gera a matriz de consistência dos últimos 6 meses (26 semanas x 7 dias = 182 dias).
 */
export function generate6MonthHeatmap(completedDates: string[] = []): HeatmapDay[][] {
  const weeks: HeatmapDay[][] = [];
  const todayStr = getTodayString();
  const today = new Date();
  
  // Encontra o fim da semana atual (sábado) para alinhar as colunas
  const endOfWeek = new Date(today);
  const daysUntilSaturday = 6 - today.getDay();
  endOfWeek.setDate(today.getDate() + daysUntilSaturday);

  const completedSet = new Set(completedDates || []);

  // 26 semanas
  const totalWeeks = 26;
  for (let w = totalWeeks - 1; w >= 0; w--) {
    const weekDays: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const dayOffset = (w * 7) + (6 - d);
      const cellDate = new Date(endOfWeek);
      cellDate.setDate(endOfWeek.getDate() - dayOffset);

      const year = cellDate.getFullYear();
      const month = String(cellDate.getMonth() + 1).padStart(2, '0');
      const day = String(cellDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const isToday = dateStr === todayStr;
      const isInFuture = dateStr > todayStr;
      const isCompleted = completedSet.has(dateStr);

      weekDays.push({
        date: dateStr,
        isCompleted,
        isToday,
        isInFuture,
        dayOfWeek: cellDate.getDay(),
      });
    }
    weeks.push(weekDays);
  }

  return weeks;
}

const pillarColorMap: Record<PillarId, string> = {
  taijutsu: '#e11d48',
  ninjutsu: '#06b6d4',
  chakra: '#10b981',
  espirito: '#f59e0b',
  genjutsu: '#8b5cf6',
};

/**
 * Constrói o objeto do Desafio de 66 Dias em sincronização perfeita e em tempo real
 * com a tela inicial (useUserStore.profile e useHabitStore.missions).
 */
export function buildSyncedOfficial66Challenge(profile: UserProfile, missions: Mission[]): UserChallenge {
  const habits: ChallengeHabit[] = (missions || []).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    pillarId: m.pillarId,
    color: pillarColorMap[m.pillarId] || '#10b981',
    completedDates: m.completedDates || [],
    createdAt: m.createdAt,
  }));

  const cycle = profile.activeChallenge;
  const cycleNumber = cycle?.cycleNumber || 1;

  return {
    id: 'challenge_official_66',
    title: `Desafio 66 Dias — Ciclo #${cycleNumber}`,
    description: 'O protocolo supremo de neuroplasticidade e formação de hábitos lendários. 100% sincronizado com a tela inicial.',
    category: 'Neuroplasticidade & Hábitos',
    icon: '⚡',
    targetDays: 66,
    startDate: cycle?.startDate || profile.lastActiveDate || getTodayString(),
    status: cycle?.status === 'completed' ? 'completed' : 'active',
    isOfficial66: true,
    habits,
    createdAt: cycle?.createdAt || profile.createdAt || new Date().toISOString(),
  };
}

interface ChallengeStoreState {
  challenges: UserChallenge[];
  activeChallengeId: string | null;
  selectedChallengeForModal: UserChallenge | null;
  isCreateModalOpen: boolean;
  isDetailModalOpen: boolean;

  // Actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDetailModal: (challengeId: string) => void;
  closeDetailModal: () => void;

  createChallenge: (data: {
    title: string;
    description?: string;
    targetDays: number;
    category?: string;
    icon?: string;
    initialHabits?: { title: string; description?: string; color?: string; pillarId?: PillarId }[];
  }) => { success: boolean; error?: string; challenge?: UserChallenge };

  updateChallenge: (challengeId: string, updates: Partial<UserChallenge>) => void;
  deleteChallenge: (challengeId: string) => void;
  toggleChallengeStatus: (challengeId: string) => void;

  addHabitToChallenge: (
    challengeId: string,
    habitData: { title: string; description?: string; color?: string; pillarId?: PillarId }
  ) => void;

  removeHabitFromChallenge: (challengeId: string, habitId: string) => void;
  updateHabit: (challengeId: string, habitId: string, updates: Partial<ChallengeHabit>) => void;

  toggleHabitDay: (
    challengeId: string,
    habitId: string,
    dateStr: string
  ) => { isCompleted: boolean; currentStreak: number; bestStreak: number };
}

export const useChallengeStore = create<ChallengeStoreState>()(
  persist(
    (set, get) => ({
      challenges: [],
      activeChallengeId: 'challenge_official_66',
      selectedChallengeForModal: null,
      isCreateModalOpen: false,
      isDetailModalOpen: false,

      openCreateModal: () => set({ isCreateModalOpen: true }),
      closeCreateModal: () => set({ isCreateModalOpen: false }),

      openDetailModal: (challengeId: string) => {
        if (challengeId === 'challenge_official_66') {
          const profile = useUserStore.getState().profile;
          const missions = useHabitStore.getState().missions;
          const official = buildSyncedOfficial66Challenge(profile, missions);
          set({
            selectedChallengeForModal: official,
            isDetailModalOpen: true,
          });
          return;
        }

        const { challenges } = get();
        const found = challenges.find((c) => c.id === challengeId);
        if (found) {
          set({
            selectedChallengeForModal: found,
            isDetailModalOpen: true,
          });
        }
      },

      closeDetailModal: () => set({ isDetailModalOpen: false, selectedChallengeForModal: null }),

      createChallenge: (data) => {
        const minDays = 21;
        const targetDays = Math.round(Number(data.targetDays));

        if (isNaN(targetDays) || targetDays < minDays) {
          return {
            success: false,
            error: `O desafio deve ter no mínimo ${minDays} dias para gerar transformação real de hábitos.`,
          };
        }

        if (!data.title.trim()) {
          return {
            success: false,
            error: 'Por favor, dê um título ao seu desafio.',
          };
        }

        const todayStr = getTodayString();
        const newChallengeId = `challenge_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        const habits: ChallengeHabit[] = (data.initialHabits && data.initialHabits.length > 0)
          ? data.initialHabits.map((h, idx) => ({
              id: `hab_${Date.now()}_${idx}`,
              title: h.title.trim(),
              description: h.description?.trim() || '',
              color: h.color || '#10b981',
              pillarId: h.pillarId || 'chakra',
              completedDates: [],
              createdAt: new Date().toISOString(),
            }))
          : [
              {
                id: `hab_${Date.now()}_default`,
                title: 'Hábito Principal',
                description: 'Executar diariamente sem desculpas',
                color: '#10b981',
                pillarId: 'chakra',
                completedDates: [],
                createdAt: new Date().toISOString(),
              },
            ];

        const newChallenge: UserChallenge = {
          id: newChallengeId,
          title: data.title.trim(),
          description: data.description?.trim() || '',
          category: data.category?.trim() || 'Transformação Pessoal',
          icon: data.icon || '🔥',
          targetDays,
          startDate: todayStr,
          status: 'active',
          isOfficial66: false,
          habits,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          challenges: [newChallenge, ...state.challenges],
          isCreateModalOpen: false,
          selectedChallengeForModal: newChallenge,
          isDetailModalOpen: true,
        }));

        soundFx.playLevelUp();
        triggerMissionConfetti();

        return { success: true, challenge: newChallenge };
      },

      updateChallenge: (challengeId, updates) => {
        set((state) => {
          const updatedChallenges = state.challenges.map((c) => {
            if (c.id === challengeId) {
              return { ...c, ...updates };
            }
            return c;
          });

          return {
            challenges: updatedChallenges,
            selectedChallengeForModal:
              state.selectedChallengeForModal?.id === challengeId
                ? { ...state.selectedChallengeForModal, ...updates }
                : state.selectedChallengeForModal,
          };
        });
      },

      deleteChallenge: (challengeId) => {
        set((state) => {
          const remaining = state.challenges.filter((c) => c.id !== challengeId);
          return {
            challenges: remaining,
            isDetailModalOpen: state.selectedChallengeForModal?.id === challengeId ? false : state.isDetailModalOpen,
            selectedChallengeForModal: state.selectedChallengeForModal?.id === challengeId ? null : state.selectedChallengeForModal,
          };
        });
      },

      toggleChallengeStatus: (challengeId) => {
        set((state) => {
          const updatedChallenges = state.challenges.map((c) => {
            if (c.id === challengeId) {
              const nextStatus: 'active' | 'completed' = c.status === 'active' ? 'completed' : 'active';
              return {
                ...c,
                status: nextStatus,
                completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
              };
            }
            return c;
          });

          return {
            challenges: updatedChallenges,
            selectedChallengeForModal:
              state.selectedChallengeForModal?.id === challengeId
                ? updatedChallenges.find((c) => c.id === challengeId) || null
                : state.selectedChallengeForModal,
          };
        });
      },

      addHabitToChallenge: (challengeId, habitData) => {
        if (!habitData.title.trim()) return;

        const isOfficial = challengeId === 'challenge_official_66' || challengeId.includes('official');
        if (isOfficial) {
          useHabitStore.getState().addMission({
            title: habitData.title.trim(),
            description: habitData.description?.trim() || '',
            pillarId: habitData.pillarId || 'chakra',
            rank: 'D',
            xpReward: 50,
            ryoReward: 35,
            timeOfDay: 'anytime',
            isCustom: true,
          });
          soundFx.playScrollOpen();
          return;
        }

        const newHabit: ChallengeHabit = {
          id: `hab_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          title: habitData.title.trim(),
          description: habitData.description?.trim() || '',
          color: habitData.color || '#10b981',
          pillarId: habitData.pillarId || 'chakra',
          completedDates: [],
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const updated = state.challenges.map((c) => {
            if (c.id === challengeId) {
              return {
                ...c,
                habits: [...c.habits, newHabit],
              };
            }
            return c;
          });

          return {
            challenges: updated,
            selectedChallengeForModal:
              state.selectedChallengeForModal?.id === challengeId
                ? {
                    ...state.selectedChallengeForModal,
                    habits: [...state.selectedChallengeForModal.habits, newHabit],
                  }
                : state.selectedChallengeForModal,
          };
        });

        soundFx.playScrollOpen();
      },

      removeHabitFromChallenge: (challengeId, habitId) => {
        const isOfficial = challengeId === 'challenge_official_66' || challengeId.includes('official');
        if (isOfficial) {
          useHabitStore.getState().deleteMission(habitId);
          return;
        }

        set((state) => {
          const updated = state.challenges.map((c) => {
            if (c.id === challengeId) {
              return {
                ...c,
                habits: c.habits.filter((h) => h.id !== habitId),
              };
            }
            return c;
          });

          return {
            challenges: updated,
            selectedChallengeForModal:
              state.selectedChallengeForModal?.id === challengeId
                ? {
                    ...state.selectedChallengeForModal,
                    habits: state.selectedChallengeForModal.habits.filter((h) => h.id !== habitId),
                  }
                : state.selectedChallengeForModal,
          };
        });
      },

      updateHabit: (challengeId, habitId, updates) => {
        const isOfficial = challengeId === 'challenge_official_66' || challengeId.includes('official');
        if (isOfficial) {
          useHabitStore.getState().updateMission(habitId, {
            title: updates.title,
            description: updates.description,
            pillarId: updates.pillarId,
          });
          return;
        }

        set((state) => {
          const updated = state.challenges.map((c) => {
            if (c.id === challengeId) {
              return {
                ...c,
                habits: c.habits.map((h) => (h.id === habitId ? { ...h, ...updates } : h)),
              };
            }
            return c;
          });

          return {
            challenges: updated,
            selectedChallengeForModal:
              state.selectedChallengeForModal?.id === challengeId
                ? {
                    ...state.selectedChallengeForModal,
                    habits: state.selectedChallengeForModal.habits.map((h) =>
                      h.id === habitId ? { ...h, ...updates } : h
                    ),
                  }
                : state.selectedChallengeForModal,
          };
        });
      },

      toggleHabitDay: (challengeId, habitId, dateStr) => {
        const todayStr = getTodayString();
        const isOfficial = challengeId === 'challenge_official_66' || challengeId.includes('official');

        if (isOfficial) {
          const habitStore = useHabitStore.getState();
          const mission = habitStore.missions.find((m) => m.id === habitId);

          if (dateStr === todayStr) {
            // Alterna a missão de hoje no motor oficial de missões (garante sincronia com a home)
            habitStore.toggleCompleteMission(habitId);
            const updatedMission = useHabitStore.getState().missions.find((m) => m.id === habitId);
            const streaks = calculateHabitStreaks(updatedMission?.completedDates || []);
            return {
              isCompleted: Boolean(updatedMission?.isCompletedToday),
              currentStreak: streaks.currentStreak,
              bestStreak: streaks.bestStreak,
            };
          } else {
            // Alterna data no histórico da missão
            const currentDates = mission?.completedDates || [];
            const willBeCompleted = !currentDates.includes(dateStr);
            const updatedDates = willBeCompleted
              ? Array.from(new Set([...currentDates, dateStr])).sort()
              : currentDates.filter((d) => d !== dateStr);

            const updatedMissions = habitStore.missions.map((m) =>
              m.id === habitId ? { ...m, completedDates: updatedDates } : m
            );
            habitStore.setCustomMissionList(updatedMissions);

            const streaks = calculateHabitStreaks(updatedDates);
            if (willBeCompleted) {
              soundFx.playMissionComplete();
            }
            useUserStore.getState().recalculateStreak();
            return {
              isCompleted: willBeCompleted,
              currentStreak: streaks.currentStreak,
              bestStreak: streaks.bestStreak,
            };
          }
        }

        // Desafio Personalizado
        const { challenges } = get();
        const challenge = challenges.find((c) => c.id === challengeId);
        const habit = challenge?.habits.find((h) => h.id === habitId);

        const currentDates = habit?.completedDates || [];
        const isCompleted = currentDates.includes(dateStr);
        const willBeCompleted = !isCompleted;

        const updatedDates = willBeCompleted
          ? Array.from(new Set([...currentDates, dateStr])).sort()
          : currentDates.filter((d) => d !== dateStr);

        const streaks = calculateHabitStreaks(updatedDates);

        set((state) => {
          const updatedChallenges = state.challenges.map((c) => {
            if (c.id === challengeId) {
              return {
                ...c,
                habits: c.habits.map((h) => {
                  if (h.id === habitId) {
                    return {
                      ...h,
                      completedDates: updatedDates,
                    };
                  }
                  return h;
                }),
              };
            }
            return c;
          });

          return {
            challenges: updatedChallenges,
            selectedChallengeForModal:
              state.selectedChallengeForModal?.id === challengeId
                ? {
                    ...state.selectedChallengeForModal,
                    habits: state.selectedChallengeForModal.habits.map((h) => {
                      if (h.id === habitId) {
                        return { ...h, completedDates: updatedDates };
                      }
                      return h;
                    }),
                  }
                : state.selectedChallengeForModal,
          };
        });

        if (willBeCompleted) {
          soundFx.playMissionComplete();
          if (dateStr === todayStr) {
            triggerMissionConfetti();
            useUserStore.getState().addXp(25, habit?.pillarId || 'chakra');
            useUserStore.getState().addRyo(15);
          }
        }

        // Reconcilia a sequência global do usuário a partir de todos os desafios
        useUserStore.getState().recalculateStreak();

        return {
          isCompleted: willBeCompleted,
          currentStreak: streaks.currentStreak,
          bestStreak: streaks.bestStreak,
        };
      },
    }),
    {
      name: 'shinobi_challenge_store_v1',
    }
  )
);
