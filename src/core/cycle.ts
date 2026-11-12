import { ProtocolChallengeCycle, DailyCheckInRecord, DayRecord } from './types';
import { getTodayString, addDaysToDateString, daysBetween, localDateFromIso, isValidDateString } from './dateUtils';

/**
 * DESAFIO (CICLO)
 * ─────────────────────────────────────────────────────────────
 * O estado do ciclo é uma FUNÇÃO PURA de (definição do ciclo, registro
 * diário, data de hoje). Nada é decidido "no momento em que o app abriu":
 * avaliar duas vezes os mesmos dados dá sempre o mesmo resultado, e se os
 * dados forem corrigidos (ex.: sincronização de outro aparelho), o
 * resultado se corrige junto.
 */

export const ABANDONED_REASON = 'Encerrado pelo próprio shinobi';
export const REPLACED_REASON = 'Substituído por um novo desafio';

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

export function getChallengeCompletionReward(targetDays: number): { xp: number; ryo: number } {
  return { xp: targetDays * 10, ryo: targetDays * 15 };
}

/**
 * Primeiro dia que PODE contar como falta.
 * O dia em que o desafio foi criado (e qualquer dia anterior a ele) nunca conta:
 * ninguém começa um desafio às 22h já devendo uma falta.
 */
export function getCycleGraceBefore(
  cycle: Pick<ProtocolChallengeCycle, 'startDate' | 'createdAt' | 'createdOn' | 'graceBefore'>
): string | undefined {
  let grace = isValidDateString(cycle.graceBefore) ? cycle.graceBefore : undefined;
  const createdOn = isValidDateString(cycle.createdOn) ? cycle.createdOn : localDateFromIso(cycle.createdAt);
  if (createdOn && createdOn >= cycle.startDate) {
    const afterCreation = addDaysToDateString(createdOn, 1);
    if (!grace || afterCreation > grace) grace = afterCreation;
  }
  return grace;
}

/** O ciclo foi encerrado por decisão do shinobi (e não pela regra de faltas)? */
export function isUserEndedCycle(cycle: ProtocolChallengeCycle): boolean {
  if (cycle.endedBy) return cycle.endedBy === 'user';
  return cycle.failedReason === ABANDONED_REASON || cycle.failedReason === REPLACED_REASON;
}

export interface CycleEvaluation {
  cycle: ProtocolChallengeCycle;
  outcome: 'active' | 'failed' | 'completed';
  failedWeek?: number;
  /** Faltas contabilizadas por semana do desafio (apenas dias já encerrados). */
  missesByWeek: Record<number, number>;
}

/**
 * Reavalia o ciclo a partir do registro diário:
 *  - presença do dia = Dia Cumprido (≥ 50% do XP previsto)
 *  - falta = dia JÁ ENCERRADO, dentro do desafio, não cumprido e fora da carência
 *  - mais faltas que o permitido na mesma semana do desafio → desafio encerrado
 *  - passou do último dia sem falhar → desafio concluído
 */
export function evaluateChallengeCycle(
  cycle: ProtocolChallengeCycle,
  dayLog: Record<string, DayRecord>,
  today: string = getTodayString()
): CycleEvaluation {
  const target = getCycleTargetDays(cycle);
  const dayNum = getCycleDayNumber(cycle, today);
  const allowed = getAllowedMissesPerWeek(cycle);
  const graceBefore = getCycleGraceBefore(cycle);

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
      checkedAt: checked ? cycle.checkIns?.[n]?.checkedAt || `${date}T12:00:00.000Z` : undefined,
    };
  }

  // Faltas apenas em dias já encerrados
  const closedUpTo = Math.min(target, dayNum - 1);
  const missesByWeek: Record<number, number> = {};
  let failedWeek: number | undefined;
  let failedOnDay: number | undefined;
  for (let n = 1; n <= closedUpTo; n++) {
    if (checkIns[n]?.checked) continue;
    if (graceBefore && checkIns[n].date < graceBefore) continue;
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
      missesByWeek,
      cycle: {
        ...updated,
        status: 'failed',
        endedBy: 'rule',
        endDate: addDaysToDateString(cycle.startDate, failedOnDay - 1),
        failedWeek,
        failedReason: `${misses} ${misses === 1 ? 'falta' : 'faltas'} na Semana ${failedWeek}${cycle.isEliteMode ? ' (Modo Elite: tolerância zero)' : ''}`,
      },
    };
  }

  if (dayNum > target) {
    return {
      outcome: 'completed',
      missesByWeek,
      cycle: {
        ...updated,
        currentDay: target,
        status: 'completed',
        endDate: getCycleEndDate(cycle),
        completedAt: cycle.completedAt || new Date().toISOString(),
      },
    };
  }

  return { outcome: 'active', missesByWeek, cycle: { ...updated, status: 'active' } };
}

/** Limpa as marcas de encerramento para reavaliar um ciclo arquivado. */
export function asActiveCandidate(cycle: ProtocolChallengeCycle): ProtocolChallengeCycle {
  return {
    ...cycle,
    status: 'active',
    endDate: undefined,
    endedBy: undefined,
    failedReason: undefined,
    failedWeek: undefined,
    completedAt: undefined,
  };
}

/**
 * Um ciclo encerrado PELA REGRA volta a valer se, com os dados atuais,
 * ele não teria sido encerrado. Ciclos encerrados pelo shinobi nunca voltam sozinhos.
 */
export function reevaluateArchivedCycle(
  cycle: ProtocolChallengeCycle,
  dayLog: Record<string, DayRecord>,
  today: string
): CycleEvaluation | null {
  if (cycle.status !== 'failed' || isUserEndedCycle(cycle)) return null;
  const result = evaluateChallengeCycle(asActiveCandidate(cycle), dayLog, today);
  return result.outcome === 'failed' ? null : result;
}
