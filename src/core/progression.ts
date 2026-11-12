import { UserProfile, Mission, ProtocolChallengeCycle, DayRecord } from './types';
import { getTodayString, getWeekKey } from './dateUtils';
import { DailyXpProgress, calculateDailyXpProgress, settleDayLog, countCompletedDays } from './dayLog';
import {
  ShieldContext,
  allocateShields,
  computeCurrentStreak,
  computeBestStreak,
  getWeeklyShieldCapacity,
  countShieldsUsedInWeek,
} from './streak';
import {
  evaluateChallengeCycle,
  reevaluateArchivedCycle,
  getCycleTargetDays,
  getCycleDayNumber,
  getCycleGraceBefore,
  getAllowedMissesPerWeek,
  getChallengeWeekNumber,
  getWeekDayRange,
  getPhaseBounds,
} from './cycle';

/**
 * RECONCILIAÇÃO DA PROGRESSÃO
 * ─────────────────────────────────────────────────────────────
 * Ponto ÚNICO onde dias, escudos, sequência e desafio são decididos.
 * Qualquer coisa que mude os dados (marcar missão, virar o dia, editar,
 * sincronizar outro aparelho) termina chamando esta função.
 *
 * Ela é pura e idempotente: mesmos dados → mesmo resultado, quantas
 * vezes rodar. Não toca em som, tela nem armazenamento — devolve os
 * EVENTOS para a camada de interface reagir.
 */

export interface ProgressionState {
  dayLog: Record<string, DayRecord>;
  shieldedDates: string[];
  shieldsThrough?: string;
  activeChallenge?: ProtocolChallengeCycle;
  challengeHistory: ProtocolChallengeCycle[];
  bestStreak: number;
}

export interface ProgressionOptions {
  today: string;
  missions: Mission[];
  shield: ShieldContext;
  /**
   * `false` enquanto os dados da nuvem ainda não chegaram: só o dia de hoje é
   * atualizado. Nenhum dia é fechado, nenhum escudo é gasto e nenhum desafio
   * é encerrado com informação possivelmente desatualizada.
   */
  settlePast?: boolean;
}

export type ProgressionEvent =
  | { type: 'shields_used'; dates: string[] }
  | { type: 'cycle_failed'; cycle: ProtocolChallengeCycle }
  | { type: 'cycle_completed'; cycle: ProtocolChallengeCycle }
  | { type: 'cycle_restored'; cycle: ProtocolChallengeCycle };

export interface ProgressionResult extends ProgressionState {
  currentStreak: number;
  completedDays: number;
  weeklyShieldsMax: number;
  weeklyShieldsRemaining: number;
  events: ProgressionEvent[];
}

export function reconcileProgression(state: ProgressionState, options: ProgressionOptions): ProgressionResult {
  const { today, missions, shield } = options;
  const settlePast = options.settlePast !== false;
  const events: ProgressionEvent[] = [];

  // 1. Registro diário, a partir dos fatos
  const { dayLog } = settleDayLog(state.dayLog || {}, missions, today, { closePast: settlePast });

  // 2. Escudos de Chakra dos dias recém-encerrados
  let shieldedDates = state.shieldedDates || [];
  let shieldsThrough = state.shieldsThrough;
  if (settlePast) {
    const allocation = allocateShields(dayLog, shieldedDates, shieldsThrough, today, shield);
    shieldedDates = allocation.shieldedDates;
    shieldsThrough = allocation.shieldsThrough;
    if (allocation.newlyShielded.length > 0) events.push({ type: 'shields_used', dates: allocation.newlyShielded });
  }

  // 3. Desafio
  let activeChallenge = state.activeChallenge && state.activeChallenge.status === 'active' ? state.activeChallenge : undefined;
  let challengeHistory = state.challengeHistory || [];

  if (activeChallenge) {
    const evaluation = evaluateChallengeCycle(activeChallenge, dayLog, today);
    if (evaluation.outcome === 'active') {
      activeChallenge = evaluation.cycle;
    } else if (settlePast) {
      activeChallenge = undefined;
      challengeHistory = [evaluation.cycle, ...challengeHistory.filter((c) => c.id !== evaluation.cycle.id)];
      events.push({ type: evaluation.outcome === 'failed' ? 'cycle_failed' : 'cycle_completed', cycle: evaluation.cycle });
    }
  } else if (settlePast && challengeHistory.length > 0) {
    // Autocorreção: o último ciclo foi encerrado pela regra, mas os dados atuais mostram que não deveria
    const revived = reevaluateArchivedCycle(challengeHistory[0], dayLog, today);
    if (revived) {
      if (revived.outcome === 'active') {
        activeChallenge = revived.cycle;
        challengeHistory = challengeHistory.slice(1);
        events.push({ type: 'cycle_restored', cycle: revived.cycle });
      } else {
        challengeHistory = [revived.cycle, ...challengeHistory.slice(1)];
        events.push({ type: 'cycle_completed', cycle: revived.cycle });
      }
    }
  }

  // 4. Derivados
  const currentStreak = computeCurrentStreak(dayLog, shieldedDates, today);
  const bestStreak = Math.max(state.bestStreak || 0, currentStreak, computeBestStreak(dayLog, shieldedDates));
  const week = getWeekKey(today);
  const weeklyShieldsMax = getWeeklyShieldCapacity(shield, week);

  return {
    dayLog,
    shieldedDates,
    shieldsThrough,
    activeChallenge,
    challengeHistory,
    bestStreak,
    currentStreak,
    completedDays: countCompletedDays(dayLog),
    weeklyShieldsMax,
    weeklyShieldsRemaining: Math.max(0, weeklyShieldsMax - countShieldsUsedInWeek(shieldedDates, week)),
    events,
  };
}

// ─────────────────────────────────────────────────────────────
// Status consolidado para a interface
// ─────────────────────────────────────────────────────────────

export interface ProtocolStatus {
  hasActiveChallenge: boolean;
  isScheduled: boolean;          // desafio criado com início futuro
  daysUntilStart: number;
  currentDay: number;            // 1..targetDays (0 se não há desafio em curso)
  targetDays: number;
  phaseIndex: 1 | 2 | 3;
  phaseName: string;
  daysRemainingInPhase: number;
  totalDaysRemaining: number;
  protocolProgressPercent: number;
  streak: number;
  weeklyShieldAvailable: boolean;
  isTodayCompleted: boolean;
  isTodayCheckedIn: boolean;
  xpProgress: DailyXpProgress;
  activeChallenge?: ProtocolChallengeCycle;
  missedDaysInCurrentWeek: number;
  allowedMissesPerWeek: number;
  currentWeek: number;
  totalWeeks: number;
}

export function evaluateProtocolStatus(
  profile: UserProfile,
  missions: Mission[] = [],
  today: string = getTodayString()
): ProtocolStatus {
  const xpProgress = calculateDailyXpProgress(missions, today);
  const cycle = profile.activeChallenge && profile.activeChallenge.status === 'active' ? profile.activeChallenge : undefined;

  const base = {
    streak: profile.currentStreak,
    weeklyShieldAvailable: profile.weeklyShieldsRemaining > 0,
    isTodayCompleted: xpProgress.isUnlocked,
    isTodayCheckedIn: xpProgress.isUnlocked,
    xpProgress,
  };

  if (!cycle) {
    return {
      ...base,
      hasActiveChallenge: false,
      isScheduled: false,
      daysUntilStart: 0,
      currentDay: 0,
      targetDays: 66,
      phaseIndex: 1,
      phaseName: 'Aguardando Desafio',
      daysRemainingInPhase: 0,
      totalDaysRemaining: 0,
      protocolProgressPercent: 0,
      activeChallenge: undefined,
      missedDaysInCurrentWeek: 0,
      allowedMissesPerWeek: 1,
      currentWeek: 1,
      totalWeeks: 10,
    };
  }

  const targetDays = getCycleTargetDays(cycle);
  const dayNum = getCycleDayNumber(cycle, today);
  const isScheduled = dayNum < 1;
  const currentDay = Math.max(0, Math.min(targetDays, dayNum));
  const { p1, p2 } = getPhaseBounds(targetDays);
  const totalWeeks = Math.max(1, Math.ceil(targetDays / 7));

  let phaseIndex: 1 | 2 | 3 = 1;
  let phaseName = 'Despertar';
  let daysRemainingInPhase = Math.max(0, p1 - currentDay);
  if (currentDay > p2) {
    phaseIndex = 3;
    phaseName = 'Mestria';
    daysRemainingInPhase = Math.max(0, targetDays - currentDay);
  } else if (currentDay > p1) {
    phaseIndex = 2;
    phaseName = 'Forja';
    daysRemainingInPhase = Math.max(0, p2 - currentDay);
  }

  // Mesma contagem usada para encerrar o ciclo (inclui a carência do dia de criação)
  const currentWeek = getChallengeWeekNumber(Math.max(1, currentDay), targetDays);
  const { startDay } = getWeekDayRange(currentWeek, targetDays);
  const graceBefore = getCycleGraceBefore(cycle);
  let missedDaysInCurrentWeek = 0;
  for (let n = startDay; n < currentDay; n++) {
    const record = cycle.checkIns?.[n];
    if (record?.checked) continue;
    if (graceBefore && record && record.date < graceBefore) continue;
    missedDaysInCurrentWeek++;
  }

  return {
    ...base,
    hasActiveChallenge: !isScheduled,
    isScheduled,
    daysUntilStart: isScheduled ? 1 - dayNum : 0,
    currentDay,
    targetDays,
    phaseIndex,
    phaseName: isScheduled ? 'Aguardando Início' : phaseName,
    daysRemainingInPhase,
    totalDaysRemaining: Math.max(0, targetDays - currentDay),
    protocolProgressPercent: Math.min(100, Math.floor((currentDay / targetDays) * 100)),
    activeChallenge: cycle,
    missedDaysInCurrentWeek,
    allowedMissesPerWeek: getAllowedMissesPerWeek(cycle),
    currentWeek,
    totalWeeks,
  };
}
