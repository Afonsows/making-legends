import {
  UserProfile,
  Mission,
  ProtocolChallengeCycle,
  DailyCheckInRecord,
  DayRecord,
  Item,
} from './types';
import {
  getTodayString,
  isValidDateString,
  addDaysToDateString,
  daysBetween,
  dateRange,
  getWeekKey,
} from './dateUtils';

export {
  getTodayString,
  isValidDateString,
  addDaysToDateString,
  getDaysDifference,
  formatDateBR,
  daysBetween,
  getWeekKey,
} from './dateUtils';

/** Fração mínima do XP previsto do dia para o dia contar como "Dia Cumprido". */
export const DAILY_TARGET_RATIO = 0.5;

// ─────────────────────────────────────────────────────────────
// Progresso do dia
// ─────────────────────────────────────────────────────────────

export interface DailyXpProgress {
  currentXp: number;
  totalTargetXp: number;
  target50PctXp: number;
  progressPercent: number;
  isUnlocked: boolean; // meta mínima atingida (Dia Cumprido)
  remainingXpToUnlock: number;
}

export function calculateDailyXpProgress(missions: Mission[], date: string = getTodayString()): DailyXpProgress {
  const totalTargetXp = (missions || []).reduce((acc, m) => acc + Math.max(0, m.xpReward || 0), 0);
  const currentXp = (missions || [])
    .filter((m) => (m.completedDates || []).includes(date))
    .reduce((acc, m) => acc + Math.max(0, m.xpReward || 0), 0);
  const target50PctXp = Math.ceil(totalTargetXp * DAILY_TARGET_RATIO);
  return {
    currentXp,
    totalTargetXp,
    target50PctXp,
    progressPercent: totalTargetXp > 0 ? Math.min(100, Math.round((currentXp / totalTargetXp) * 100)) : 0,
    isUnlocked: totalTargetXp > 0 && currentXp >= target50PctXp,
    remainingXpToUnlock: Math.max(0, target50PctXp - currentXp),
  };
}

export function isDayRecordCompleted(xpEarned: number, xpTarget: number): boolean {
  return xpTarget > 0 && xpEarned >= Math.ceil(xpTarget * DAILY_TARGET_RATIO);
}

/**
 * Monta (ou atualiza) o registro de um dia a partir das missões.
 * - Dia já fechado: permanece congelado.
 * - Fechando agora: preserva o maior XP visto (missões excluídas não apagam o passado).
 */
export function buildDayRecord(
  missions: Mission[],
  date: string,
  closed: boolean,
  previous?: DayRecord
): DayRecord {
  if (previous?.closed) return previous;
  const progress = calculateDailyXpProgress(missions, date);
  const xpTarget = closed && previous && previous.xpTarget > 0 ? previous.xpTarget : progress.totalTargetXp;
  const xpEarned = closed ? Math.max(progress.currentXp, previous?.xpEarned || 0) : progress.currentXp;
  return {
    date,
    xpEarned,
    xpTarget,
    completed: isDayRecordCompleted(xpEarned, xpTarget),
    closed,
  };
}

/** Fecha (congela) todos os dias anteriores a `today` desde o último dia ativo. */
export function closePastDays(
  dayLog: Record<string, DayRecord>,
  missions: Mission[],
  lastActiveDate: string,
  today: string
): { dayLog: Record<string, DayRecord>; closedDates: string[] } {
  const next = { ...dayLog };
  const closedDates: string[] = [];
  const yesterday = addDaysToDateString(today, -1);

  // Qualquer registro aberto de dias anteriores
  Object.keys(next).forEach((date) => {
    if (date < today && !next[date].closed) {
      next[date] = buildDayRecord(missions, date, true, next[date]);
      closedDates.push(date);
    }
  });

  if (isValidDateString(lastActiveDate) && lastActiveDate < today) {
    const earliest = addDaysToDateString(today, -400);
    const from = lastActiveDate < earliest ? earliest : lastActiveDate;
    dateRange(from, yesterday).forEach((date) => {
      if (!next[date] || !next[date].closed) {
        next[date] = buildDayRecord(missions, date, true, next[date]);
        if (!closedDates.includes(date)) closedDates.push(date);
      }
    });
  }

  closedDates.sort();
  return { dayLog: next, closedDates };
}

export function countCompletedDays(dayLog: Record<string, DayRecord>): number {
  return Object.values(dayLog || {}).filter((r) => r.completed).length;
}

// ─────────────────────────────────────────────────────────────
// Sequência (streak) e Escudo de Chakra
// ─────────────────────────────────────────────────────────────

function earliestDate(dayLog: Record<string, DayRecord>, shieldedDates: string[]): string | null {
  const all = [...Object.keys(dayLog || {}), ...(shieldedDates || [])].filter(isValidDateString).sort();
  return all[0] || null;
}

/** Sequência terminando EXATAMENTE em `date` (dias protegidos não somam nem quebram). */
export function streakEndingAt(
  dayLog: Record<string, DayRecord>,
  shieldedDates: string[],
  date: string
): number {
  const first = earliestDate(dayLog, shieldedDates);
  if (!first) return 0;
  const shielded = new Set(shieldedDates || []);
  let count = 0;
  let cursor = date;
  while (cursor >= first) {
    if (dayLog[cursor]?.completed) count++;
    else if (!shielded.has(cursor)) break;
    cursor = addDaysToDateString(cursor, -1);
  }
  return count;
}

/** Sequência atual. Hoje ainda em andamento não quebra a sequência. */
export function computeCurrentStreak(
  dayLog: Record<string, DayRecord>,
  shieldedDates: string[],
  today: string = getTodayString()
): number {
  if (dayLog[today]?.completed) return streakEndingAt(dayLog, shieldedDates, today);
  return streakEndingAt(dayLog, shieldedDates, addDaysToDateString(today, -1));
}

export function computeBestStreak(dayLog: Record<string, DayRecord>, shieldedDates: string[]): number {
  const first = earliestDate(dayLog, shieldedDates);
  if (!first) return 0;
  const dates = Object.keys(dayLog).filter(isValidDateString).sort();
  const last = dates[dates.length - 1] || first;
  const shielded = new Set(shieldedDates || []);
  let best = 0;
  let run = 0;
  dateRange(first, last).forEach((date) => {
    if (dayLog[date]?.completed) {
      run++;
      best = Math.max(best, run);
    } else if (!shielded.has(date)) {
      run = 0;
    }
  });
  return best;
}

export interface ShieldContext {
  isEliteMode: boolean;
  equippedItems: Item[];
  extraShieldWeeks: string[];
}

/** Quantos Escudos de Chakra o shinobi tem na semana informada. */
export function getWeeklyShieldCapacity(ctx: ShieldContext, weekKey: string): number {
  if (ctx.isEliteMode) return 0;
  const itemShields = ctx.equippedItems
    .filter((i) => i.buffType === 'extra_shield')
    .reduce((acc, i) => acc + Math.max(0, i.buffValue || 0), 0);
  const purchased = (ctx.extraShieldWeeks || []).includes(weekKey) ? 1 : 0;
  return 1 + itemShields + purchased;
}

export function countShieldsUsedInWeek(shieldedDates: string[], weekKey: string): number {
  return (shieldedDates || []).filter((d) => getWeekKey(d) === weekKey).length;
}

/**
 * Para cada dia recém-fechado e NÃO cumprido, usa um Escudo de Chakra da semana
 * (se houver) para proteger uma sequência ativa.
 */
export function applyShieldsToClosedDays(
  dayLog: Record<string, DayRecord>,
  shieldedDates: string[],
  closedDates: string[],
  ctx: ShieldContext
): { shieldedDates: string[]; newlyShielded: string[] } {
  const next = [...(shieldedDates || [])];
  const newlyShielded: string[] = [];
  [...closedDates].sort().forEach((date) => {
    if (dayLog[date]?.completed || next.includes(date)) return;
    const streakBefore = streakEndingAt(dayLog, next, addDaysToDateString(date, -1));
    if (streakBefore <= 0) return;
    const week = getWeekKey(date);
    if (countShieldsUsedInWeek(next, week) < getWeeklyShieldCapacity(ctx, week)) {
      next.push(date);
      newlyShielded.push(date);
    }
  });
  next.sort();
  return { shieldedDates: next, newlyShielded };
}

// ─────────────────────────────────────────────────────────────
// Desafio (ciclo) — regra semanal de faltas
// ─────────────────────────────────────────────────────────────

export function getCycleTargetDays(cycle?: Pick<ProtocolChallengeCycle, 'targetDays'> | null): number {
  return Math.max(1, Math.round(cycle?.targetDays || 66));
}

export function getCycleEndDate(cycle: Pick<ProtocolChallengeCycle, 'startDate' | 'targetDays'>): string {
  return addDaysToDateString(cycle.startDate, getCycleTargetDays(cycle) - 1);
}

/** Número do dia do desafio para uma data (pode ser ≤ 0 antes do início ou > duração depois do fim). */
export function getCycleDayNumber(cycle: Pick<ProtocolChallengeCycle, 'startDate'>, date: string): number {
  return daysBetween(cycle.startDate, date) + 1;
}

export function getAllowedMissesPerWeek(cycle?: Pick<ProtocolChallengeCycle, 'isEliteMode'> | null): number {
  return cycle?.isEliteMode ? 0 : 1;
}

export function getChallengeWeekNumber(dayNumber: number, targetDays: number = 66): number {
  const totalWeeks = Math.max(1, Math.ceil(targetDays / 7));
  const day = Math.min(targetDays, Math.max(1, dayNumber));
  return Math.min(totalWeeks, Math.ceil(day / 7));
}

export function getWeekDayRange(weekNumber: number, targetDays: number = 66): { startDay: number; endDay: number } {
  const totalWeeks = Math.max(1, Math.ceil(targetDays / 7));
  const week = Math.min(totalWeeks, Math.max(1, weekNumber));
  return { startDay: (week - 1) * 7 + 1, endDay: Math.min(targetDays, week * 7) };
}

export function getPhaseBounds(targetDays: number): { p1: number; p2: number } {
  const p1 = Math.max(1, Math.round(targetDays / 3));
  const p2 = Math.max(p1 + 1, Math.round((targetDays * 2) / 3));
  return { p1, p2 };
}

export interface CycleEvaluation {
  cycle: ProtocolChallengeCycle;
  outcome: 'active' | 'failed' | 'completed';
  failedWeek?: number;
}

/**
 * Reavalia o ciclo a partir do histórico diário:
 * - presença do dia = Dia Cumprido (≥ 50% do XP previsto)
 * - mais faltas que o permitido na mesma semana do desafio → desafio encerrado
 * - passou do último dia sem falhar → desafio concluído
 */
export function evaluateChallengeCycle(
  cycle: ProtocolChallengeCycle,
  dayLog: Record<string, DayRecord>,
  today: string = getTodayString()
): CycleEvaluation {
  const target = getCycleTargetDays(cycle);
  const dayNum = getCycleDayNumber(cycle, today);
  const allowed = getAllowedMissesPerWeek(cycle);
  const graceBefore = (cycle as ProtocolChallengeCycle & { graceBefore?: string }).graceBefore;

  const checkIns: Record<number, DailyCheckInRecord> = {};
  const lastKnownDay = Math.min(target, dayNum);
  for (let n = 1; n <= lastKnownDay; n++) {
    const date = addDaysToDateString(cycle.startDate, n - 1);
    const rec = dayLog[date];
    const checked = Boolean(rec?.completed);
    checkIns[n] = {
      dayNumber: n,
      date,
      checked,
      xpEarned: rec?.xpEarned || 0,
      targetXp: rec?.xpTarget || 0,
      checkedAt: checked ? cycle.checkIns?.[n]?.checkedAt || new Date().toISOString() : undefined,
    };
  }

  // Faltas apenas em dias já encerrados
  const closedUpTo = Math.min(target, dayNum - 1);
  const missesByWeek: Record<number, number> = {};
  let failedWeek: number | undefined;
  let failedOnDay: number | undefined;
  for (let n = 1; n <= closedUpTo; n++) {
    if (checkIns[n]?.checked) continue;
    if (graceBefore && checkIns[n] && checkIns[n].date < graceBefore) continue;
    const week = Math.ceil(n / 7);
    missesByWeek[week] = (missesByWeek[week] || 0) + 1;
    if (missesByWeek[week] > allowed) {
      failedWeek = week;
      failedOnDay = n;
      break;
    }
  }

  const daysCompleted = Object.values(checkIns).filter((r) => r.checked).length;
  const totalXpEarned = Object.values(checkIns).reduce((acc, r) => acc + (r.checked ? r.xpEarned : 0), 0);

  const updated: ProtocolChallengeCycle = {
    ...cycle,
    targetDays: target,
    checkIns,
    daysCompleted,
    totalXpEarned,
    currentDay: Math.max(0, Math.min(target, dayNum)),
  };

  if (failedWeek !== undefined && failedOnDay !== undefined) {
    const misses = missesByWeek[failedWeek];
    return {
      outcome: 'failed',
      failedWeek,
      cycle: {
        ...updated,
        status: 'failed',
        endDate: addDaysToDateString(cycle.startDate, failedOnDay - 1),
        failedWeek,
        failedReason: `${misses} ${misses === 1 ? 'falta' : 'faltas'} na Semana ${failedWeek}${cycle.isEliteMode ? ' (Modo Elite: tolerância zero)' : ''}`,
      },
    };
  }

  if (dayNum > target) {
    return {
      outcome: 'completed',
      cycle: {
        ...updated,
        currentDay: target,
        status: 'completed',
        endDate: getCycleEndDate(cycle),
        completedAt: new Date().toISOString(),
      },
    };
  }

  return { outcome: 'active', cycle: { ...updated, status: 'active' } };
}

export function getChallengeCompletionReward(targetDays: number): { xp: number; ryo: number } {
  return { xp: targetDays * 10, ryo: targetDays * 15 };
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

  const currentWeek = getChallengeWeekNumber(Math.max(1, currentDay), targetDays);
  const { startDay } = getWeekDayRange(currentWeek, targetDays);
  let missedDaysInCurrentWeek = 0;
  for (let n = startDay; n < currentDay; n++) {
    if (!cycle.checkIns?.[n]?.checked) missedDaysInCurrentWeek++;
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

/** Retorna o ciclo ativo, se houver. */
export function ensureActiveChallenge(profile: UserProfile): ProtocolChallengeCycle | undefined {
  return profile.activeChallenge && profile.activeChallenge.status === 'active' ? profile.activeChallenge : undefined;
}

// ─────────────────────────────────────────────────────────────
// Migração de dados legados (v1 → v2)
// ─────────────────────────────────────────────────────────────

/**
 * Reconstrói o histórico diário a partir dos dados antigos (check-ins de ciclos e
 * datas de conclusão das missões), sem perder nenhum dia já conquistado.
 */
export function buildDayLogFromLegacy(
  profile: Partial<UserProfile>,
  missions: Mission[],
  today: string = getTodayString()
): Record<string, DayRecord> {
  const log: Record<string, DayRecord> = {};
  const totalTarget = (missions || []).reduce((acc, m) => acc + Math.max(0, m.xpReward || 0), 0);

  const dates = new Set<string>();
  (missions || []).forEach((m) => (m.completedDates || []).forEach((d) => isValidDateString(d) && d <= today && dates.add(d)));
  dates.forEach((date) => {
    log[date] = buildDayRecord(missions, date, date < today);
    if (log[date].xpTarget === 0) log[date].xpTarget = totalTarget;
  });

  const cycles = [
    ...(profile.activeChallenge ? [profile.activeChallenge] : []),
    ...(profile.challengeHistory || []),
  ];
  cycles.forEach((cycle) => {
    Object.values(cycle?.checkIns || {}).forEach((rec) => {
      if (!rec?.checked || !isValidDateString(rec.date) || rec.date > today) return;
      const prev = log[rec.date];
      log[rec.date] = {
        date: rec.date,
        xpEarned: Math.max(prev?.xpEarned || 0, rec.xpEarned || 0),
        xpTarget: prev?.xpTarget || rec.targetXp || totalTarget,
        completed: true,
        closed: rec.date < today,
      };
    });
  });

  return log;
}
