import { DayRecord, Mission } from './types';
import { getTodayString, isValidDateString, addDaysToDateString, dateRange } from './dateUtils';

/**
 * REGISTRO DIÁRIO
 * ─────────────────────────────────────────────────────────────
 * O registro de um dia é sempre calculado a partir dos FATOS
 * (quais missões têm aquela data marcada), nunca do momento em
 * que o app estava aberto. Regras:
 *
 *  - Hoje (dia aberto): reflete exatamente as missões marcadas.
 *  - Dias passados (fechados): a meta fica congelada e o progresso
 *    só pode SUBIR. Um aparelho com dados atrasados nunca transforma
 *    um dia cumprido em falta; quando os dados chegam, o dia se corrige.
 *  - Correção manual de um dia passado recalcula aquele dia exatamente.
 */

/** Fração mínima do XP previsto do dia para o dia contar como "Dia Cumprido". */
export const DAILY_TARGET_RATIO = 0.5;
/** Limite de dias reprocessados para trás (proteção de desempenho). */
const MAX_LOOKBACK_DAYS = 400;

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

const sameRecord = (a: DayRecord | undefined, b: DayRecord): boolean =>
  Boolean(a) &&
  a!.xpEarned === b.xpEarned &&
  a!.xpTarget === b.xpTarget &&
  a!.completed === b.completed &&
  a!.closed === b.closed &&
  a!.editedAt === b.editedAt;

/**
 * Atualiza o registro de um dia com base nas missões.
 * Dia aberto: valor exato. Dia fechado: meta congelada e progresso que só sobe.
 */
export function settleDay(previous: DayRecord | undefined, missions: Mission[], date: string, today: string): DayRecord {
  const progress = calculateDailyXpProgress(missions, date);

  if (date >= today) {
    const open: DayRecord = {
      date,
      xpEarned: progress.currentXp,
      xpTarget: progress.totalTargetXp,
      completed: progress.isUnlocked,
      closed: false,
    };
    return sameRecord(previous, open) ? previous! : open;
  }

  const xpTarget = previous && previous.xpTarget > 0 ? previous.xpTarget : progress.totalTargetXp;
  const xpEarned = Math.max(previous?.xpEarned || 0, progress.currentXp);
  const closed: DayRecord = {
    date,
    xpEarned,
    xpTarget,
    // Um dia fechado como cumprido nunca volta a ser falta sozinho
    completed: Boolean(previous?.closed && previous.completed) || isDayRecordCompleted(xpEarned, xpTarget),
    closed: true,
    ...(previous?.editedAt ? { editedAt: previous.editedAt } : {}),
  };
  return sameRecord(previous, closed) ? previous! : closed;
}

/** Correção manual de um dia passado: recalcula exatamente a partir das missões. */
export function recomputeDay(
  previous: DayRecord | undefined,
  missions: Mission[],
  date: string,
  editedAt: string = new Date().toISOString()
): DayRecord {
  const progress = calculateDailyXpProgress(missions, date);
  const xpTarget = previous && previous.xpTarget > 0 ? previous.xpTarget : progress.totalTargetXp;
  return {
    date,
    xpEarned: progress.currentXp,
    xpTarget,
    completed: isDayRecordCompleted(progress.currentXp, xpTarget),
    closed: true,
    editedAt,
  };
}

/**
 * Compatibilidade: monta o registro de um dia.
 * `closed = true` fecha o dia preservando o maior XP já visto.
 */
export function buildDayRecord(missions: Mission[], date: string, closed: boolean, previous?: DayRecord): DayRecord {
  return settleDay(previous, missions, date, closed ? addDaysToDateString(date, 1) : date);
}

export interface SettleResult {
  dayLog: Record<string, DayRecord>;
  /** Dias cujo registro foi criado ou alterado nesta passada. */
  changedDates: string[];
}

/**
 * Passa por todos os dias conhecidos (do primeiro registro até hoje) e deixa
 * cada um consistente com as missões. Pode rodar quantas vezes for — o
 * resultado é sempre o mesmo para os mesmos dados.
 */
export function settleDayLog(
  dayLog: Record<string, DayRecord>,
  missions: Mission[],
  today: string,
  options: { closePast?: boolean } = {}
): SettleResult {
  const closePast = options.closePast !== false;
  const source = dayLog || {};
  const next: Record<string, DayRecord> = { ...source };
  const changedDates: string[] = [];

  const apply = (date: string) => {
    const record = settleDay(next[date], missions, date, today);
    if (record !== next[date]) {
      next[date] = record;
      changedDates.push(date);
    }
  };

  if (closePast) {
    const yesterday = addDaysToDateString(today, -1);
    const floor = addDaysToDateString(today, -MAX_LOOKBACK_DAYS);
    const known = Object.keys(source).filter((d) => isValidDateString(d) && d < today);
    const marked = (missions || []).flatMap((m) => (m.completedDates || []).filter((d) => isValidDateString(d) && d < today));
    const all = [...known, ...marked].sort();
    if (all.length > 0) {
      const from = all[0] < floor ? floor : all[0];
      dateRange(from, yesterday).forEach(apply);
    }
  }
  apply(today);

  return { dayLog: changedDates.length ? next : source, changedDates: changedDates.sort() };
}

/** Junta o registro do mesmo dia vindo de dois aparelhos (nunca perde um dia cumprido). */
export function mergeDayRecords(a?: DayRecord, b?: DayRecord): DayRecord | undefined {
  if (!a) return b;
  if (!b) return a;
  if ((a.editedAt || '') !== (b.editedAt || '')) {
    // Correção manual mais recente vence por inteiro
    return (a.editedAt || '') > (b.editedAt || '') ? a : b;
  }
  const xpEarned = Math.max(a.xpEarned || 0, b.xpEarned || 0);
  const xpTarget =
    a.closed !== b.closed ? (a.closed ? a.xpTarget : b.xpTarget) || Math.max(a.xpTarget, b.xpTarget) : Math.max(a.xpTarget || 0, b.xpTarget || 0);
  const merged: DayRecord = {
    date: a.date,
    xpEarned,
    xpTarget,
    completed: a.completed || b.completed || isDayRecordCompleted(xpEarned, xpTarget),
    closed: a.closed || b.closed,
    ...(a.editedAt ? { editedAt: a.editedAt } : {}),
  };
  if (sameRecord(a, merged)) return a;
  if (sameRecord(b, merged)) return b;
  return merged;
}

export function mergeDayLogs(
  a: Record<string, DayRecord> = {},
  b: Record<string, DayRecord> = {}
): Record<string, DayRecord> {
  const out: Record<string, DayRecord> = {};
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach((date) => {
    if (!isValidDateString(date)) return;
    const merged = mergeDayRecords(a[date], b[date]);
    if (merged) out[date] = merged;
  });
  return out;
}

export function countCompletedDays(dayLog: Record<string, DayRecord>): number {
  return Object.values(dayLog || {}).filter((r) => r.completed).length;
}
