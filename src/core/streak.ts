import { DayRecord, Item } from './types';
import { getTodayString, isValidDateString, addDaysToDateString, dateRange, getWeekKey } from './dateUtils';

/**
 * SEQUÊNCIA E ESCUDO DE CHAKRA
 * ─────────────────────────────────────────────────────────────
 * A sequência é contada direto do registro diário. Dias protegidos
 * por escudo não somam, mas também não quebram.
 */

function earliestDate(dayLog: Record<string, DayRecord>, shieldedDates: string[]): string | null {
  const all = [...Object.keys(dayLog || {}), ...(shieldedDates || [])].filter(isValidDateString).sort();
  return all[0] || null;
}

/** Sequência terminando EXATAMENTE em `date` (dias protegidos não somam nem quebram). */
export function streakEndingAt(dayLog: Record<string, DayRecord>, shieldedDates: string[], date: string): number {
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
 * Para cada dia informado que terminou sem ser cumprido, usa um Escudo de Chakra
 * da semana (se houver) para proteger uma sequência ativa.
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

export interface ShieldAllocation {
  shieldedDates: string[];
  newlyShielded: string[];
  /** Último dia já avaliado — dias até aqui não são reavaliados. */
  shieldsThrough: string;
}

/**
 * Avalia os dias encerrados depois de `shieldsThrough`.
 *  - um escudo gasto em um dia que depois se revelou cumprido é devolvido
 *    e os dias seguintes são reavaliados;
 *  - cada dia é avaliado uma única vez (o escudo não é aplicado retroativamente
 *    por equipamentos ou compras feitos depois).
 */
export function allocateShields(
  dayLog: Record<string, DayRecord>,
  shieldedDates: string[],
  shieldsThrough: string | undefined,
  today: string,
  ctx: ShieldContext
): ShieldAllocation {
  const yesterday = addDaysToDateString(today, -1);
  let through = isValidDateString(shieldsThrough) ? shieldsThrough : yesterday;
  if (through > yesterday) through = yesterday;

  const valid = Array.from(new Set((shieldedDates || []).filter(isValidDateString))).sort();
  const wasted = valid.filter((d) => dayLog[d]?.completed);
  let kept = valid;
  if (wasted.length > 0) {
    kept = valid.filter((d) => !dayLog[d]?.completed);
    const rewind = addDaysToDateString(wasted[0], -1);
    if (rewind < through) through = rewind;
  }

  const pending = Object.keys(dayLog || {})
    .filter((d) => isValidDateString(d) && d > through && d <= yesterday && dayLog[d].closed && !dayLog[d].completed)
    .sort();
  const result = applyShieldsToClosedDays(dayLog, kept, pending, ctx);
  return { shieldedDates: result.shieldedDates, newlyShielded: result.newlyShielded, shieldsThrough: yesterday };
}
