import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserChallenge, Mission, BoardSection, BoardMilestone } from '../core/types';
import {
  BOARD_TEMPLATES,
  boardGrantPrefix,
  desiredBoardGrants,
  instantiateTemplate,
  isBoard,
  sanitizeSections,
} from '../core/board';
import {
  CHALLENGE_MODEL_VERSION,
  challengeRewardKey,
  clampTargetDays,
  lastCountedDate,
  missionsOfChallenge,
  normalizeChallengeData,
} from '../core/challenges';
import { addDaysToDateString, daysBetween, getTodayString, isValidDateString } from '../core/dateUtils';
import { soundFx } from '../utils/audio';
import { triggerDayCompleteConfetti, triggerMissionConfetti } from '../utils/confetti';
import { useUserStore } from './useUserStore';
import { useHabitStore } from './useHabitStore';

/**
 * Deixa os lançamentos de HOJE de um quadro iguais ao que as marcações merecem
 * (células, seções completas e dia cumprido). Idempotente: rodar de novo não muda nada.
 * Retorna as conquistas novas (seções/dia) para a celebração.
 */
function syncBoardRewards(challenge: UserChallenge): { sections: string[]; day: boolean } {
  const gained = { sections: [] as string[], day: false };
  if (!isBoard(challenge) || challenge.status !== 'active') return gained;
  const today = getTodayString();
  const prefix = boardGrantPrefix(challenge.id, today);
  const inRange = today >= challenge.startDate && today <= lastCountedDate(challenge);
  const desired = inRange ? desiredBoardGrants(challenge, today) : [];
  const desiredKeys = new Set(desired.map((d) => d.key));

  Object.keys(useUserStore.getState().profile.grants || {})
    .filter((key) => key.startsWith(prefix) && !desiredKeys.has(key))
    .forEach((key) => useUserStore.getState().revokeReward(key));

  desired.forEach((d) => {
    if (useUserStore.getState().profile.grants?.[d.key]) return;
    const grant = useUserStore.getState().grantReward({
      key: d.key,
      label: d.label,
      baseXp: d.xp,
      baseRyo: d.ryo,
      pillarId: d.pillarId,
      dealDamage: d.dealDamage,
    });
    if (!grant) return;
    if (d.kind === 'section') gained.sections.push(d.label.replace(/^Seção completa: /, ''));
    if (d.kind === 'day') gained.day = true;
  });
  return gained;
}

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

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

/** Rascunho de hábito ao criar um desafio. */
export type HabitDraft = Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>;

export interface NewChallengeInput {
  title: string;
  description?: string;
  targetDays: number;
  /** Padrão: hoje. Pode ser no passado (para registrar dias já feitos) ou até 30 dias no futuro. */
  startDate?: string;
  isEliteMode?: boolean;
  /** Hábitos novos do desafio (inclusive cópias dos hábitos de outro desafio). */
  habits?: HabitDraft[];
  /** Hábitos avulsos que passam a pertencer ao desafio. */
  moveMissionIds?: string[];
}

interface ChallengeStoreState {
  challenges: UserChallenge[];
  selectedChallengeId: string | null;
  isCreateModalOpen: boolean;
  isDetailModalOpen: boolean;

  openCreateModal: () => void;
  closeCreateModal: () => void;
  openDetailModal: (challengeId: string) => void;
  closeDetailModal: () => void;

  /** Desafio de hábitos (o formato padrão). */
  createChallenge: (data: NewChallengeInput) => { success: boolean; error?: string; challenge?: UserChallenge };
  /** Título, descrição, duração, início e Modo Elite. */
  updateChallenge: (
    challengeId: string,
    updates: Partial<Pick<UserChallenge, 'title' | 'description' | 'targetDays' | 'startDate' | 'isEliteMode' | 'icon' | 'category'>>
  ) => void;
  /** Encerra por decisão do shinobi: concluído antes do fim ou abandonado. */
  closeChallenge: (challengeId: string, kind: 'completed' | 'abandoned') => void;
  /** Desfaz o encerramento feito pelo shinobi. */
  reopenChallenge: (challengeId: string) => void;
  /** Apaga o desafio como se nunca tivesse existido (hábitos, marcações e recompensas dele). */
  deleteChallenge: (challengeId: string) => void;

  // ── Quadro de operação ──
  /** Cria um desafio em formato de quadro a partir de um modelo (começa hoje, salvo `startDate`). */
  createBoardChallenge: (
    templateId: string,
    overrides?: { title?: string; targetDays?: number; startDate?: string }
  ) => UserChallenge | null;
  /**
   * Marca/desmarca células do quadro em uma data. Sem `value`, inverte o grupo
   * (marca tudo se faltar alguma; senão desmarca tudo).
   */
  toggleBoardCells: (challengeId: string, keys: string[], date: string, value?: boolean) => { blockedReason?: string };
  /** Salva a estrutura do quadro (seções, meta do dia, marcos). */
  updateBoard: (
    challengeId: string,
    updates: { sections?: BoardSection[]; dailyGoalPct?: number; milestones?: BoardMilestone[] }
  ) => void;
}

const stamp = () => new Date().toISOString();

const nextCycleNumber = (challenges: UserChallenge[]) =>
  challenges.reduce((max, c) => Math.max(max, c.cycleNumber || 0), 0) + 1;

export const useChallengeStore = create<ChallengeStoreState>()(
  persist(
    (set, get) => {
      /** Troca um desafio da lista (edição do shinobi neste aparelho). */
      const replace = (updated: UserChallenge) =>
        set((state) => ({ challenges: state.challenges.map((c) => (c.id === updated.id ? updated : c)) }));

      const afterChange = () => useUserStore.getState().reconcile({ silent: true });

      return {
        challenges: [],
        selectedChallengeId: null,
        isCreateModalOpen: false,
        isDetailModalOpen: false,

        openCreateModal: () => set({ isCreateModalOpen: true }),
        closeCreateModal: () => set({ isCreateModalOpen: false }),
        openDetailModal: (challengeId) => {
          if (!get().challenges.some((c) => c.id === challengeId)) return;
          set({ selectedChallengeId: challengeId, isDetailModalOpen: true });
        },
        closeDetailModal: () => set({ isDetailModalOpen: false, selectedChallengeId: null }),

        createChallenge: (data) => {
          const title = data.title.trim();
          if (!title) return { success: false, error: 'Dê um nome ao desafio.' };
          const habits = data.habits || [];
          const moveIds = data.moveMissionIds || [];
          if (habits.length + moveIds.length === 0) return { success: false, error: 'Inclua pelo menos um hábito.' };

          const today = getTodayString();
          let startDate = data.startDate && isValidDateString(data.startDate) ? data.startDate : today;
          if (daysBetween(today, startDate) > 30) startDate = addDaysToDateString(today, 30);
          const targetDays = clampTargetDays(data.targetDays);
          const createdAt = stamp();

          const challenge: UserChallenge = {
            v: CHALLENGE_MODEL_VERSION,
            id: `challenge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title,
            description: data.description?.trim() || undefined,
            category: 'Hábitos',
            targetDays,
            startDate,
            status: 'active',
            habits: [],
            format: 'habits',
            isEliteMode: Boolean(data.isEliteMode),
            createdOn: today,
            // Começar no passado serve para registrar o que já foi feito, sem gerar faltas
            ...(startDate < today ? { graceBefore: today } : {}),
            cycleNumber: nextCycleNumber(get().challenges),
            createdAt,
            updatedAt: createdAt,
          };
          if (!challenge.description) delete challenge.description;

          set((state) => ({ challenges: [challenge, ...state.challenges], isCreateModalOpen: false }));
          const habitStore = useHabitStore.getState();
          if (habits.length > 0) habitStore.addMissionsToChallenge(habits, challenge.id);
          if (moveIds.length > 0) habitStore.moveMissionsToChallenge(moveIds, challenge.id);
          afterChange();

          soundFx.playChallengeStart();
          triggerMissionConfetti();
          return { success: true, challenge: get().challenges.find((c) => c.id === challenge.id) || challenge };
        },

        updateChallenge: (challengeId, updates) => {
          const current = get().challenges.find((c) => c.id === challengeId);
          if (!current) return;
          const next: UserChallenge = { ...current, updatedAt: stamp() };
          if (updates.title !== undefined && updates.title.trim()) next.title = updates.title.trim();
          if (updates.description !== undefined) next.description = updates.description.trim() || undefined;
          if (updates.targetDays !== undefined) next.targetDays = clampTargetDays(updates.targetDays);
          if (updates.startDate !== undefined && isValidDateString(updates.startDate)) next.startDate = updates.startDate;
          if (updates.isEliteMode !== undefined) next.isEliteMode = updates.isEliteMode;
          if (updates.icon !== undefined) next.icon = updates.icon;
          if (updates.category !== undefined) next.category = updates.category;
          if (!next.description) delete next.description;
          replace(next);
          if (isBoard(next)) syncBoardRewards(get().challenges.find((c) => c.id === challengeId)!);
          afterChange();
        },

        closeChallenge: (challengeId, kind) => {
          const current = get().challenges.find((c) => c.id === challengeId);
          if (!current || current.closedAt) return;
          const today = getTodayString();
          const at = stamp();
          // O último dia que conta: hoje, se já houve marcação hoje; senão ontem (os hábitos saem de Hoje na hora).
          // Desafio que nem começou: o dia anterior ao início.
          const links = useUserStore.getState().profile.habitLinks;
          const markedToday = isBoard(current)
            ? (current.marks?.[today] || []).length > 0
            : missionsOfChallenge(current.id, useHabitStore.getState().missions, links).some((m) =>
                (m.completedDates || []).includes(today)
              );
          const closedOn =
            today < current.startDate
              ? addDaysToDateString(current.startDate, -1)
              : markedToday
              ? today
              : addDaysToDateString(today, -1);
          replace({ ...current, closedAt: at, closedOn, closeKind: kind, updatedAt: at });
          if (isBoard(current)) syncBoardRewards(get().challenges.find((c) => c.id === challengeId)!);
          afterChange();
        },

        reopenChallenge: (challengeId) => {
          const current = get().challenges.find((c) => c.id === challengeId);
          if (!current || !current.closedAt) return;
          const next: UserChallenge = { ...current, updatedAt: stamp() };
          delete next.closedAt;
          delete next.closedOn;
          delete next.closeKind;
          replace(next);
          afterChange();
        },

        deleteChallenge: (challengeId) => {
          const target = get().challenges.find((c) => c.id === challengeId);
          if (!target) return;
          const user = useUserStore.getState();
          const habitStore = useHabitStore.getState();
          const today = getTodayString();
          const ownIds = new Set(missionsOfChallenge(challengeId, habitStore.missions, user.profile.habitLinks).map((m) => m.id));

          // 1. Recompensas do próprio desafio (bônus, quadro, hábitos antigos e as missões dele)
          const ownKey = (key: string) =>
            key === challengeRewardKey(challengeId) ||
            key.startsWith(`board:${challengeId}:`) ||
            key.startsWith(`habit:${challengeId}:`) ||
            Array.from(ownIds).some((id) => key.startsWith(`mission:${id}:`) || key.startsWith(`retro:${id}:`));
          Object.keys(user.profile.grants || {})
            .filter(ownKey)
            .forEach((key) => useUserStore.getState().revokeReward(key));

          // 2. Os hábitos dele somem (lápides para os outros aparelhos)
          const touchedDates = new Set<string>();
          habitStore.missions
            .filter((m) => ownIds.has(m.id))
            .forEach((m) => (m.completedDates || []).forEach((d) => d < today && touchedDates.add(d)));
          const at = stamp();
          const deletedMissions = { ...useUserStore.getState().profile.deletedMissions };
          ownIds.forEach((id) => (deletedMissions[id] = at));
          useHabitStore.setState((state) => ({ missions: state.missions.filter((m) => !ownIds.has(m.id)) }));

          // 3. O desafio some (lápide) e os dias em que os hábitos dele contavam são recalculados
          set((state) => ({
            challenges: state.challenges.filter((c) => c.id !== challengeId),
            isDetailModalOpen: state.selectedChallengeId === challengeId ? false : state.isDetailModalOpen,
            selectedChallengeId: state.selectedChallengeId === challengeId ? null : state.selectedChallengeId,
          }));
          const profile = useUserStore.getState().profile;
          useUserStore.getState().updateProfile({
            deletedMissions,
            deletedCycles: { ...profile.deletedCycles, [challengeId]: at },
          });
          useUserStore.getState().recomputePastDays(Array.from(touchedDates));
          afterChange();
        },

        createBoardChallenge: (templateId, overrides = {}) => {
          const template = BOARD_TEMPLATES.find((t) => t.id === templateId);
          if (!template) return null;
          const today = getTodayString();
          const startDate = overrides.startDate || today;
          const targetDays = Math.max(7, Math.round(overrides.targetDays || template.targetDays));
          const { sections, milestones } = instantiateTemplate(template, startDate, targetDays);
          const createdAt = stamp();
          const challenge: UserChallenge = {
            v: CHALLENGE_MODEL_VERSION,
            id: `challenge_board_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: overrides.title?.trim() || template.title,
            description: template.description,
            category: template.category,
            icon: template.icon,
            targetDays,
            startDate,
            status: 'active',
            isOfficial66: false,
            habits: [],
            createdAt,
            createdOn: today,
            cycleNumber: nextCycleNumber(get().challenges),
            updatedAt: createdAt,
            format: 'board',
            sections,
            marks: {},
            dailyGoalPct: template.dailyGoalPct,
            milestones,
          };
          set((state) => ({
            challenges: [challenge, ...state.challenges],
            isCreateModalOpen: false,
            selectedChallengeId: challenge.id,
            isDetailModalOpen: true,
          }));
          afterChange();
          soundFx.playChallengeStart();
          triggerMissionConfetti();
          return challenge;
        },

        toggleBoardCells: (challengeId, keys, date, value) => {
          const todayStr = getTodayString();
          const challenge = get().challenges.find((c) => c.id === challengeId);
          if (!challenge || !isBoard(challenge) || keys.length === 0) return {};
          if (date > todayStr) {
            soundFx.playError();
            return { blockedReason: 'Dias futuros ainda não podem ser marcados.' };
          }
          if (date < challenge.startDate || date > lastCountedDate(challenge)) {
            soundFx.playError();
            return { blockedReason: 'Esse dia está fora do período do desafio.' };
          }

          const current = new Set(challenge.marks?.[date] || []);
          const next = value ?? !keys.every((k) => current.has(k));
          keys.forEach((k) => (next ? current.add(k) : current.delete(k)));
          const marks = { ...(challenge.marks || {}) };
          if (current.size > 0) marks[date] = Array.from(current).sort();
          else delete marks[date];
          // Cada célula guarda o instante da mudança: é o que permite mesclar dois aparelhos
          const at = stamp();
          const cellStamps = { ...(challenge.cellStamps || {}) };
          keys.forEach((k) => (cellStamps[`${date}|${k}`] = { on: next, at }));

          const updated: UserChallenge = { ...challenge, marks, cellStamps };
          replace(updated);

          if (next) soundFx.playMissionComplete();
          else soundFx.playMissionUndo();

          // Recompensa só no próprio dia (dias passados: só corrige o registro)
          if (date === todayStr) {
            const gained = syncBoardRewards(updated);
            const user = useUserStore.getState();
            if (gained.day) {
              soundFx.playDayComplete();
              triggerDayCompleteConfetti();
              user.pushToast({ kind: 'reward', title: 'Dia cumprido na operação', message: `${challenge.title}: meta do dia batida.` });
            } else if (gained.sections.length > 0) {
              triggerMissionConfetti();
              user.pushToast({ kind: 'success', title: 'Seção completa', message: gained.sections.join(' · ') });
            }
          }
          afterChange();
          return {};
        },

        updateBoard: (challengeId, updates) => {
          const challenge = get().challenges.find((c) => c.id === challengeId);
          if (!challenge || !isBoard(challenge)) return;
          const updated: UserChallenge = {
            ...challenge,
            updatedAt: stamp(),
            ...(updates.sections ? { sections: sanitizeSections(updates.sections) } : {}),
            ...(updates.dailyGoalPct !== undefined
              ? { dailyGoalPct: Math.min(100, Math.max(1, Math.round(updates.dailyGoalPct))) }
              : {}),
            ...(updates.milestones
              ? {
                  milestones: updates.milestones
                    .filter((m) => m.label.trim() && /^\d{4}-\d{2}-\d{2}$/.test(m.date))
                    .map((m) => ({ ...m, label: m.label.trim() }))
                    .sort((a, b) => a.date.localeCompare(b.date)),
                }
              : {}),
          };
          replace(updated);
          syncBoardRewards(updated);
          afterChange();
        },
      };
    },
    {
      name: 'shinobi_challenge_store_v1',
      version: 3,
      partialize: (state) => ({ challenges: state.challenges }) as unknown as ChallengeStoreState,
      migrate: (persisted) => persisted as ChallengeStoreState,
      merge: (persisted, current) => {
        const saved = (persisted || {}) as Partial<ChallengeStoreState>;
        return {
          ...current,
          challenges: (Array.isArray(saved.challenges) ? saved.challenges : []).filter(
            (c) => c && !c.isOfficial66 && c.id !== 'challenge_official_66'
          ),
        };
      },
    }
  )
);

// ─────────────────────────────────────────────────────────────
// Conversão do formato antigo (uma vez por aparelho; idempotente)
// ─────────────────────────────────────────────────────────────

/**
 * Leva os dados locais para o modelo único: o antigo "desafio principal"
 * (ciclos no perfil), os desafios personalizados com hábitos próprios e o
 * vínculo de cada missão. Não conta como edição do shinobi.
 */
export function migrateLegacyChallenges(today: string = getTodayString()): void {
  const user = useUserStore.getState();
  const profile = user.profile;
  const missions = useHabitStore.getState().missions;
  const challenges = useChallengeStore.getState().challenges;
  const hasLegacyCycles = Boolean(profile.activeChallenge) || (profile.challengeHistory || []).length > 0;
  const hasLegacyCustom = challenges.some((c) => c.v !== CHALLENGE_MODEL_VERSION);
  const missingLinks = missions.some((m) => !profile.habitLinks?.[m.id]);
  if (!hasLegacyCycles && !hasLegacyCustom && !missingLinks) return;

  const result = normalizeChallengeData({
    challenges,
    missions,
    links: profile.habitLinks,
    activeCycle: profile.activeChallenge,
    cycleHistory: profile.challengeHistory,
    today,
  });

  setChallengesSilently(result.challenges);
  if (result.missions.length !== missions.length) useHabitStore.getState().replaceMissions(result.missions);
  useUserStore.setState((state) => ({
    profile: { ...state.profile, habitLinks: result.links, activeChallenge: undefined, challengeHistory: [] },
  }));
  useUserStore.getState().reconcile({ silent: true });
}

// ─────────────────────────────────────────────────────────────
// Sincronização
// ─────────────────────────────────────────────────────────────

let silentUpdate = false;

/** Atualiza a lista sem contar como edição do shinobi (sincronização e rotinas automáticas). */
export function setChallengesSilently(challenges: UserChallenge[]) {
  silentUpdate = true;
  try {
    useChallengeStore.setState({ challenges });
  } finally {
    silentUpdate = false;
  }
}

// Qualquer outra mudança na lista foi feita pelo shinobi neste aparelho
useChallengeStore.subscribe((state, previous) => {
  if (!silentUpdate && state.challenges !== previous.challenges) useUserStore.getState().touch();
});
