import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NutritionLog, BodyJournalEntry, TrainingLogEntry } from '../core/types';
import { getTodayString } from '../core/streakEngine';

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

interface ToolStoreState {
  lastActiveDate: string;

  // 1. Nutrição
  nutritionLogs: Record<string, NutritionLog>;
  currentCalorieTarget: number;
  currentProteinTarget: number;
  addMeal: (meal: { name: string; calories: number; protein: number; time: string }) => void;
  setNutritionTargets: (calories: number, protein: number) => void;

  // 2. Técnica de Concentração (Pomodoro)
  pomodoroSessionsCompletedToday: number;
  incrementPomodoroSession: () => void;

  // 3. Meditação do Chakra
  meditationMinutesToday: number;
  logMeditationSession: (minutes: number) => void;

  // 4. Selo de Bloqueio
  sealLockActive: boolean;
  sealMinutesRemaining: number;
  setSealLock: (active: boolean, minutes?: number) => void;

  // 5. Diário do Corpo (Sono & Água)
  bodyJournal: Record<string, BodyJournalEntry>;
  addWaterGlass: () => void;
  removeWaterGlass: () => void;
  logSleep: (hours: number, quality: 1 | 2 | 3 | 4 | 5, notes?: string) => void;

  // 6. Registro de Treinamento (Taijutsu)
  trainingLogs: TrainingLogEntry[];
  addTrainingLog: (entry: Omit<TrainingLogEntry, 'id' | 'date'>) => void;

  // 7. Manutenção Diária (Reset de Contadores às 00:00)
  resetDailyToolsIfNewDay: () => void;
}

export const useToolStore = create<ToolStoreState>()(
  persist(
    (set, get) => ({
      lastActiveDate: getTodayString(),
      nutritionLogs: {},
      currentCalorieTarget: 2200,
      currentProteinTarget: 140,
      pomodoroSessionsCompletedToday: 0,
      meditationMinutesToday: 0,
      sealLockActive: false,
      sealMinutesRemaining: 0,
      bodyJournal: {},
      trainingLogs: [],

      resetDailyToolsIfNewDay: () => {
        const todayStr = getTodayString();
        const { lastActiveDate } = get();
        if (lastActiveDate !== todayStr) {
          set({
            lastActiveDate: todayStr,
            pomodoroSessionsCompletedToday: 0,
            meditationMinutesToday: 0,
            sealLockActive: false,
            sealMinutesRemaining: 0,
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
          meals: []
        };

        const updated: NutritionLog = {
          ...existing,
          caloriesConsumed: existing.caloriesConsumed + meal.calories,
          proteinGrams: existing.proteinGrams + meal.protein,
          meals: [...existing.meals, meal]
        };

        set((state) => ({
          nutritionLogs: { ...state.nutritionLogs, [todayStr]: updated }
        }));
      },

      setNutritionTargets: (calories, protein) => {
        set({ currentCalorieTarget: calories, currentProteinTarget: protein });
      },

      incrementPomodoroSession: () => {
        set((state) => ({
          pomodoroSessionsCompletedToday: state.pomodoroSessionsCompletedToday + 1
        }));
      },

      logMeditationSession: (minutes) => {
        set((state) => ({
          meditationMinutesToday: state.meditationMinutesToday + minutes
        }));
      },

      setSealLock: (active, minutes = 0) => {
        set({ sealLockActive: active, sealMinutesRemaining: minutes });
      },

      addWaterGlass: () => {
        const todayStr = getTodayString();
        const existing = get().bodyJournal[todayStr] || {
          date: todayStr,
          sleepHours: 7,
          sleepQuality: 4,
          waterGlasses: 0
        };

        const updated: BodyJournalEntry = {
          ...existing,
          waterGlasses: Math.min(20, existing.waterGlasses + 1)
        };

        set((state) => ({
          bodyJournal: { ...state.bodyJournal, [todayStr]: updated }
        }));
      },

      removeWaterGlass: () => {
        const todayStr = getTodayString();
        const existing = get().bodyJournal[todayStr];
        if (!existing || existing.waterGlasses <= 0) return;

        const updated: BodyJournalEntry = {
          ...existing,
          waterGlasses: Math.max(0, existing.waterGlasses - 1)
        };

        set((state) => ({
          bodyJournal: { ...state.bodyJournal, [todayStr]: updated }
        }));
      },

      logSleep: (hours, quality, notes) => {
        const todayStr = getTodayString();
        const existing = get().bodyJournal[todayStr] || {
          date: todayStr,
          sleepHours: 7,
          sleepQuality: 4,
          waterGlasses: 0
        };

        const updated: BodyJournalEntry = {
          ...existing,
          sleepHours: hours,
          sleepQuality: quality,
          notes
        };

        set((state) => ({
          bodyJournal: { ...state.bodyJournal, [todayStr]: updated }
        }));
      },

      addTrainingLog: (entry) => {
        const newLog: TrainingLogEntry = {
          ...entry,
          id: `train_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          date: getTodayString()
        };

        set((state) => ({
          trainingLogs: [newLog, ...state.trainingLogs]
        }));
      }
    }),
    {
      name: 'making-legends-tool-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const todayStr = getTodayString();
          if (state.lastActiveDate !== todayStr) {
            state.lastActiveDate = todayStr;
            state.pomodoroSessionsCompletedToday = 0;
            state.meditationMinutesToday = 0;
            state.sealLockActive = false;
            state.sealMinutesRemaining = 0;
          }
        }
      },
    }
  )
);
