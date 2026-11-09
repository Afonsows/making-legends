import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NutritionLog, BodyJournalEntry, TrainingLogEntry } from '../core/types';
import { getTodayString } from '../core/dateUtils';
import { PillarId } from '../theme/types';
import { useUserStore } from './useUserStore';

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  pillarCategory: 'ninjutsu' | 'genjutsu' | 'chakra' | 'espirito' | 'taijutsu';
  readTime: string;
  coverEmoji: string;
  coreThesis: string;
  keyJutsus: {
    rule: string;
    explanation: string;
    actionableStep: string;
  }[];
}

export const bookSummariesList: BookSummary[] = [
  {
    id: 'book_atomic_habits',
    title: 'Hábitos Atômicos',
    author: 'James Clear',
    pillarCategory: 'chakra',
    readTime: '4 min de leitura',
    coverEmoji: '⚛️',
    coreThesis: 'Pequenas melhorias de 1% todos os dias acumulam resultados exponenciais ao longo dos 66 dias.',
    keyJutsus: [
      {
        rule: '1. Torne Óbvio (O Gatilho Visual)',
        explanation: 'Deixe as pistas do hábito desejado visíveis no seu ambiente e esconda as distrações.',
        actionableStep: 'Deixe o livro ou a roupa de treino já preparados à vista na noite anterior.'
      },
      {
        rule: '2. Torne Atraente (Agrupamento de Tentação)',
        explanation: 'Associe uma ação que você precisa fazer com uma ação que você quer fazer.',
        actionableStep: 'Só ouça seu podcast favorito enquanto estiver caminhando ou treinando.'
      },
      {
        rule: '3. A Regra dos Dois Minutos',
        explanation: 'Reduza o início de qualquer novo hábito a uma ação realizável em menos de 120 segundos.',
        actionableStep: 'Em vez de "ler 1 hora", a meta de ativação é "abrir o livro e ler 1 página".'
      }
    ]
  },
  {
    id: 'book_deep_work',
    title: 'Trabalho Focado (Deep Work)',
    author: 'Cal Newport',
    pillarCategory: 'genjutsu',
    readTime: '5 min de leitura',
    coverEmoji: '🎯',
    coreThesis: 'A habilidade de se concentrar sem distração em tarefas cognitivamente exigentes é a superpotência do século XXI.',
    keyJutsus: [
      {
        rule: '1. Ritualize o Santuário de Foco',
        explanation: 'Defina um local específico e elimine qualquer notificação ou interrupção externa.',
        actionableStep: 'Ative o Selo de Bloqueio e guarde o celular em outro cômodo durante blocos de 45 minutos.'
      },
      {
        rule: '2. Abrace o Tédio',
        explanation: 'Se você pega o telefone toda vez que fica entediado, seu cérebro perde a capacidade de focar profundamente.',
        actionableStep: 'Fique 5 minutos em fila ou espera sem olhar tela alguma.'
      },
      {
        rule: '3. Encerramento Rígido do Dia',
        explanation: 'Desligue o modo de trabalho completamente ao anoitecer para restaurar energia mental.',
        actionableStep: 'Crie uma frase ou rotina de encerramento diário às 19h.'
      }
    ]
  },
  {
    id: 'book_mindset',
    title: 'Mindset: A Nova Psicologia do Sucesso',
    author: 'Carol S. Dweck',
    pillarCategory: 'espirito',
    readTime: '4 min de leitura',
    coverEmoji: '🌱',
    coreThesis: 'O talento inicial é apenas o ponto de partida. O esforço e a resiliência forjam a maestria real.',
    keyJutsus: [
      {
        rule: '1. O Poder do "Ainda Não"',
        explanation: 'Substitua "eu não consigo fazer isso" por "eu ainda não domino isso".',
        actionableStep: 'Diante de uma falha em uma missão, analise a causa sem se rotular negativamente.'
      },
      {
        rule: '2. O Desafio como Alimento',
        explanation: 'Guerreiros com mindset de crescimento buscam tarefas difíceis porque sabem que é nelas que o cérebro evolui.',
        actionableStep: 'Escolha hoje ao menos uma missão de Rank B ou A.'
      }
    ]
  },
  {
    id: 'book_cant_hurt_me',
    title: 'Nada Pode Me Ferir',
    author: 'David Goggins',
    pillarCategory: 'espirito',
    readTime: '5 min de leitura',
    coverEmoji: '🔥',
    coreThesis: 'Quando sua mente diz que você atingiu o limite, você utilizou apenas cerca de 40% da sua capacidade real.',
    keyJutsus: [
      {
        rule: '1. O Pote dos Biscoitos (Memória de Vitórias)',
        explanation: 'Lembre-se de todas as adversidades e desafios que você já superou no passado para alimentar a coragem no presente.',
        actionableStep: 'Anote 3 momentos da sua vida em que você venceu quando tudo parecia difícil.'
      },
      {
        rule: '2. O Espelho da Responsabilidade',
        explanation: 'Encare sua realidade diária com honestidade brutal, sem desculpas ou vitimismo.',
        actionableStep: 'Assuma 100% de responsabilidade pelo cumprimento das suas missões de hoje.'
      }
    ]
  }
];

/** Limites diários de recompensa das ferramentas (evita "farmar" XP). */
export const TOOL_LIMITS = {
  mealsRewarded: 3,
  workoutsRewarded: 3,
  pomodoroSessions: 6,
  meditationMinutes: 30,
  waterGoalGlasses: 8,
};

export const TOOL_REWARDS = {
  meal: { xp: 10, ryo: 8 },
  workout: { xp: 35, ryo: 25 },
  sleep: { xp: 20, ryo: 15 },
  water: { xp: 25, ryo: 15 },
  seal: { xp: 30, ryo: 20 },
  pomodoroPerMinute: { xp: 1.4, ryo: 0.8 },
  meditationPerMinute: { xp: 8, ryo: 5 },
};

export interface PomodoroState {
  mode: 'work' | 'break';
  durationMinutes: number;
  endsAt: number | null;       // timestamp quando estiver rodando
  remainingSeconds: number;    // quando pausado
}

interface ToolStoreState {
  lastActiveDate: string;

  // 1. Nutrição
  nutritionLogs: Record<string, NutritionLog>;
  currentCalorieTarget: number;
  currentProteinTarget: number;
  addMeal: (meal: { name: string; calories: number; protein: number; time: string }) => { rewarded: boolean };
  setNutritionTargets: (calories: number, protein: number) => void;

  // 2. Técnica de Concentração (Pomodoro)
  pomodoroSessionsCompletedToday: number;
  pomodoro: PomodoroState;
  setPomodoroPreset: (mode: 'work' | 'break', minutes: number) => void;
  startPomodoro: () => void;
  pausePomodoro: () => void;
  resetPomodoro: () => void;
  completePomodoroIfDue: () => { completed: boolean; rewarded: boolean; mode?: 'work' | 'break' };
  incrementPomodoroSession: () => void;

  // 3. Meditação do Chakra
  meditationMinutesToday: number;
  logMeditationSession: (minutes: number) => { rewardedMinutes: number };

  // 4. Selo de Bloqueio
  sealLockActive: boolean;
  sealMinutesRemaining: number;
  sealEndsAt: number | null;
  setSealLock: (active: boolean, minutes?: number) => { rewarded: boolean };
  completeSealIfDue: () => { completed: boolean; rewarded: boolean };

  // 5. Diário do Corpo (Sono & Água)
  bodyJournal: Record<string, BodyJournalEntry>;
  addWaterGlass: () => void;
  removeWaterGlass: () => void;
  logSleep: (hours: number, quality: 1 | 2 | 3 | 4 | 5, notes?: string) => { rewarded: boolean };

  // 6. Registro de Treinamento (Taijutsu)
  trainingLogs: TrainingLogEntry[];
  addTrainingLog: (entry: Omit<TrainingLogEntry, 'id' | 'date'>) => { rewarded: boolean };

  // 7. Manutenção Diária
  resetDailyToolsIfNewDay: () => void;
  countRewardedToday: (prefix: string) => number;
}

const emptyBodyEntry = (date: string): BodyJournalEntry => ({
  date,
  sleepHours: 0,
  sleepQuality: 3,
  waterGlasses: 0,
  sleepLogged: false,
});

const defaultPomodoro = (): PomodoroState => ({ mode: 'work', durationMinutes: 25, endsAt: null, remainingSeconds: 25 * 60 });

export const useToolStore = create<ToolStoreState>()(
  persist(
    (set, get) => {
      const grant = (key: string, label: string, xp: number, ryo: number, pillarId: PillarId) =>
        Boolean(
          useUserStore.getState().grantReward({
            key,
            label,
            baseXp: Math.round(xp),
            baseRyo: Math.round(ryo),
            pillarId,
            applyRyoBuffs: false,
          })
        );

      return {
        lastActiveDate: getTodayString(),
        nutritionLogs: {},
        currentCalorieTarget: 2200,
        currentProteinTarget: 140,
        pomodoroSessionsCompletedToday: 0,
        pomodoro: defaultPomodoro(),
        meditationMinutesToday: 0,
        sealLockActive: false,
        sealMinutesRemaining: 0,
        sealEndsAt: null,
        bodyJournal: {},
        trainingLogs: [],

        countRewardedToday: (prefix) => {
          const today = getTodayString();
          return Object.values(useUserStore.getState().profile.grants || {}).filter(
            (g) => g.date === today && g.key.startsWith(prefix)
          ).length;
        },

        resetDailyToolsIfNewDay: () => {
          const todayStr = getTodayString();
          if (get().lastActiveDate !== todayStr) {
            set({
              lastActiveDate: todayStr,
              pomodoroSessionsCompletedToday: 0,
              meditationMinutesToday: 0,
              sealLockActive: false,
              sealMinutesRemaining: 0,
              sealEndsAt: null,
            });
          }
        },

        addMeal: (meal) => {
          const todayStr = getTodayString();
          const existing = get().nutritionLogs[todayStr] || {
            id: `nutri_${todayStr}`,
            date: todayStr,
            caloriesTarget: get().currentCalorieTarget,
            caloriesConsumed: 0,
            proteinGrams: 0,
            carbsGrams: 0,
            fatGrams: 0,
            meals: [],
          };
          const updated: NutritionLog = {
            ...existing,
            caloriesConsumed: existing.caloriesConsumed + Math.max(0, meal.calories),
            proteinGrams: existing.proteinGrams + Math.max(0, meal.protein),
            meals: [...existing.meals, meal],
          };
          set((state) => ({ nutritionLogs: { ...state.nutritionLogs, [todayStr]: updated } }));

          const index = updated.meals.length;
          if (index > TOOL_LIMITS.mealsRewarded) return { rewarded: false };
          return {
            rewarded: grant(`tool:meal:${todayStr}:${index}`, `Refeição registrada: ${meal.name}`, TOOL_REWARDS.meal.xp, TOOL_REWARDS.meal.ryo, 'taijutsu'),
          };
        },

        setNutritionTargets: (calories, protein) => set({ currentCalorieTarget: calories, currentProteinTarget: protein }),

        setPomodoroPreset: (mode, minutes) =>
          set({ pomodoro: { mode, durationMinutes: minutes, endsAt: null, remainingSeconds: minutes * 60 } }),

        startPomodoro: () => {
          const { pomodoro } = get();
          if (pomodoro.endsAt) return;
          set({ pomodoro: { ...pomodoro, endsAt: Date.now() + pomodoro.remainingSeconds * 1000 } });
        },

        pausePomodoro: () => {
          const { pomodoro } = get();
          if (!pomodoro.endsAt) return;
          const remaining = Math.max(0, Math.round((pomodoro.endsAt - Date.now()) / 1000));
          set({ pomodoro: { ...pomodoro, endsAt: null, remainingSeconds: remaining } });
        },

        resetPomodoro: () => {
          const { pomodoro } = get();
          set({ pomodoro: { ...pomodoro, endsAt: null, remainingSeconds: pomodoro.durationMinutes * 60 } });
        },

        completePomodoroIfDue: () => {
          const { pomodoro } = get();
          if (!pomodoro.endsAt || Date.now() < pomodoro.endsAt) return { completed: false, rewarded: false };
          const todayStr = getTodayString();
          let rewarded = false;
          if (pomodoro.mode === 'work') {
            const session = get().pomodoroSessionsCompletedToday + 1;
            set({ pomodoroSessionsCompletedToday: session });
            if (session <= TOOL_LIMITS.pomodoroSessions) {
              const minutes = pomodoro.durationMinutes;
              rewarded = grant(
                `tool:pomo:${todayStr}:${session}`,
                `Sessão de foco de ${minutes} min`,
                minutes * TOOL_REWARDS.pomodoroPerMinute.xp,
                minutes * TOOL_REWARDS.pomodoroPerMinute.ryo,
                'genjutsu'
              );
            }
            set({ pomodoro: { mode: 'break', durationMinutes: 5, endsAt: null, remainingSeconds: 5 * 60 } });
          } else {
            set({ pomodoro: defaultPomodoro() });
          }
          return { completed: true, rewarded, mode: pomodoro.mode };
        },

        incrementPomodoroSession: () => set((state) => ({ pomodoroSessionsCompletedToday: state.pomodoroSessionsCompletedToday + 1 })),

        logMeditationSession: (minutes) => {
          const todayStr = getTodayString();
          const already = get().meditationMinutesToday;
          const rewardedMinutes = Math.max(0, Math.min(minutes, TOOL_LIMITS.meditationMinutes - already));
          set({ meditationMinutesToday: already + Math.max(0, minutes) });
          if (rewardedMinutes > 0) {
            grant(
              `tool:meditation:${todayStr}:${Date.now()}`,
              `Meditação de ${minutes} min`,
              rewardedMinutes * TOOL_REWARDS.meditationPerMinute.xp,
              rewardedMinutes * TOOL_REWARDS.meditationPerMinute.ryo,
              'chakra'
            );
          }
          return { rewardedMinutes };
        },

        setSealLock: (active, minutes = 0) => {
          const duration = Math.max(1, Math.round(minutes || 60));
          set({
            sealLockActive: active,
            sealMinutesRemaining: active ? duration : 0,
            sealEndsAt: active ? Date.now() + duration * 60_000 : null,
          });
          // A recompensa só é entregue ao término da sessão, não na ativação.
          return { rewarded: false };
        },

        completeSealIfDue: () => {
          const { sealLockActive, sealEndsAt } = get();
          if (!sealLockActive || !sealEndsAt || Date.now() < sealEndsAt) return { completed: false, rewarded: false };
          const todayStr = getTodayString();
          set({ sealLockActive: false, sealMinutesRemaining: 0, sealEndsAt: null });
          return {
            completed: true,
            rewarded: grant(`tool:seal:${todayStr}`, 'Sessão de foco sem distrações concluída', TOOL_REWARDS.seal.xp, TOOL_REWARDS.seal.ryo, 'chakra'),
          };
        },

        addWaterGlass: () => {
          const todayStr = getTodayString();
          const existing = get().bodyJournal[todayStr] || emptyBodyEntry(todayStr);
          const glasses = Math.min(20, existing.waterGlasses + 1);
          set((state) => ({ bodyJournal: { ...state.bodyJournal, [todayStr]: { ...existing, waterGlasses: glasses } } }));
          if (glasses >= TOOL_LIMITS.waterGoalGlasses) {
            grant(`tool:water:${todayStr}`, 'Meta de hidratação atingida', TOOL_REWARDS.water.xp, TOOL_REWARDS.water.ryo, 'taijutsu');
          }
        },

        removeWaterGlass: () => {
          const todayStr = getTodayString();
          const existing = get().bodyJournal[todayStr];
          if (!existing || existing.waterGlasses <= 0) return;
          const glasses = existing.waterGlasses - 1;
          set((state) => ({ bodyJournal: { ...state.bodyJournal, [todayStr]: { ...existing, waterGlasses: glasses } } }));
          if (glasses < TOOL_LIMITS.waterGoalGlasses) useUserStore.getState().revokeReward(`tool:water:${todayStr}`);
        },

        logSleep: (hours, quality, notes) => {
          const todayStr = getTodayString();
          const existing = get().bodyJournal[todayStr] || emptyBodyEntry(todayStr);
          set((state) => ({
            bodyJournal: {
              ...state.bodyJournal,
              [todayStr]: { ...existing, sleepHours: hours, sleepQuality: quality, notes, sleepLogged: true },
            },
          }));
          return {
            rewarded: grant(`tool:sleep:${todayStr}`, 'Registro de sono', TOOL_REWARDS.sleep.xp, TOOL_REWARDS.sleep.ryo, 'taijutsu'),
          };
        },

        addTrainingLog: (entry) => {
          const todayStr = getTodayString();
          const newLog: TrainingLogEntry = {
            ...entry,
            id: `train_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            date: todayStr,
          };
          set((state) => ({ trainingLogs: [newLog, ...state.trainingLogs].slice(0, 300) }));
          const index = get().trainingLogs.filter((l) => l.date === todayStr).length;
          if (index > TOOL_LIMITS.workoutsRewarded) return { rewarded: false };
          return {
            rewarded: grant(`tool:workout:${todayStr}:${index}`, `Treino: ${entry.exerciseName}`, TOOL_REWARDS.workout.xp, TOOL_REWARDS.workout.ryo, 'taijutsu'),
          };
        },
      };
    },
    {
      name: 'making-legends-tool-store',
      version: 2,
      migrate: (persisted) => persisted as ToolStoreState,
      merge: (persisted, current) => {
        const saved = (persisted || {}) as Partial<ToolStoreState>;
        const todayStr = getTodayString();
        const merged = { ...current, ...saved } as ToolStoreState;
        merged.pomodoro = { ...defaultPomodoro(), ...(saved.pomodoro || {}) };
        if (merged.lastActiveDate !== todayStr) {
          merged.lastActiveDate = todayStr;
          merged.pomodoroSessionsCompletedToday = 0;
          merged.meditationMinutesToday = 0;
          merged.sealLockActive = false;
          merged.sealMinutesRemaining = 0;
          merged.sealEndsAt = null;
        }
        return merged;
      },
    }
  )
);
