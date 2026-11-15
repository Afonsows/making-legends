import { Mission, UserProfile } from './types';
import { PillarId } from '../theme/types';
import { addDaysToDateString, getWeekKey } from './dateUtils';
import { LEGACY_BASE_KEY } from './ledger';

/**
 * Resumo semanal (segunda a domingo), derivado dos fatos já guardados:
 * diário de dias, escudos, livro-razão de recompensas e marcações das missões.
 */

export type WeekDayState = 'done' | 'shield' | 'missed' | 'today' | 'future' | 'none';

export interface WeekDay {
  date: string;
  state: WeekDayState;
}

export interface WeekTotals {
  daysCompleted: number;
  xp: number;
  missionsDone: number;
}

export interface WeekSummary extends WeekTotals {
  weekStart: string; // segunda-feira
  weekEnd: string;   // domingo
  days: WeekDay[];
  /** Dias da semana que já aconteceram (até hoje, inclusive). */
  daysElapsed: number;
  /** A semana já terminou. */
  isClosed: boolean;
  pillarXp: Record<PillarId, number>;
  topPillar: { id: PillarId; xp: number } | null;
  previous: WeekTotals;
  /** Variação de XP em relação à semana anterior, em % (null quando não há base). */
  xpChangePct: number | null;
}

const PILLARS: PillarId[] = ['taijutsu', 'ninjutsu', 'chakra', 'espirito', 'genjutsu'];

interface TodayOverride {
  /** Hoje já atingiu a meta (calculado ao vivo a partir das missões). */
  completed: boolean;
}

function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateString(weekStart, i));
}

function totalsFor(
  profile: UserProfile,
  missions: Mission[],
  dates: string[],
  today: string,
  todayOverride?: TodayOverride
): WeekTotals & { pillarXp: Record<PillarId, number> } {
  const inWeek = new Set(dates);
  const pillarXp = Object.fromEntries(PILLARS.map((p) => [p, 0])) as Record<PillarId, number>;
  let xp = 0;

  Object.values(profile.grants || {}).forEach((g) => {
    if (!g || g.key === LEGACY_BASE_KEY || !inWeek.has(g.date)) return;
    xp += g.xp || 0;
    if (g.pillarXp) PILLARS.forEach((p) => (pillarXp[p] += g.pillarXp?.[p] || 0));
    else if (g.pillarId && pillarXp[g.pillarId] !== undefined) pillarXp[g.pillarId] += g.xp || 0;
  });

  const daysCompleted = dates.filter((date) =>
    date === today && todayOverride ? todayOverride.completed : Boolean(profile.dayLog?.[date]?.completed)
  ).length;

  const missionsDone = missions.reduce(
    (acc, m) => acc + (m.completedDates || []).filter((date) => inWeek.has(date)).length,
    0
  );

  PILLARS.forEach((p) => (pillarXp[p] = Math.max(0, Math.round(pillarXp[p]))));
  return { daysCompleted, xp: Math.max(0, Math.round(xp)), missionsDone, pillarXp };
}

/** Monta o resumo da semana que contém `dateInWeek`. */
export function buildWeekSummary(
  profile: UserProfile,
  missions: Mission[],
  dateInWeek: string,
  today: string,
  todayOverride?: TodayOverride
): WeekSummary {
  const weekStart = getWeekKey(dateInWeek);
  const dates = weekDates(weekStart);
  const weekEnd = dates[6];
  const shielded = new Set(profile.shieldedDates || []);

  const current = totalsFor(profile, missions, dates, today, todayOverride);
  const previousTotals = totalsFor(profile, missions, weekDates(addDaysToDateString(weekStart, -7)), today, todayOverride);

  const days: WeekDay[] = dates.map((date) => {
    if (date > today) return { date, state: 'future' };
    const record = profile.dayLog?.[date];
    const done = date === today && todayOverride ? todayOverride.completed : Boolean(record?.completed);
    if (done) return { date, state: 'done' };
    if (date === today) return { date, state: 'today' };
    if (shielded.has(date)) return { date, state: 'shield' };
    if (record?.closed && record.xpTarget > 0) return { date, state: 'missed' };
    return { date, state: 'none' };
  });

  const top = PILLARS.map((id) => ({ id, xp: current.pillarXp[id] })).sort((a, b) => b.xp - a.xp)[0];

  return {
    weekStart,
    weekEnd,
    days,
    daysElapsed: dates.filter((d) => d <= today).length,
    isClosed: weekEnd < today,
    daysCompleted: current.daysCompleted,
    xp: current.xp,
    missionsDone: current.missionsDone,
    pillarXp: current.pillarXp,
    topPillar: top && top.xp > 0 ? top : null,
    previous: {
      daysCompleted: previousTotals.daysCompleted,
      xp: previousTotals.xp,
      missionsDone: previousTotals.missionsDone,
    },
    xpChangePct: previousTotals.xp > 0 ? Math.round(((current.xp - previousTotals.xp) / previousTotals.xp) * 100) : null,
  };
}

/**
 * Qual semana destacar na tela "Hoje": no domingo, a semana que está fechando;
 * na segunda, a que acabou de terminar. Nos outros dias, nenhuma.
 */
export function getRecapWeek(today: string): { dateInWeek: string; kind: 'closing' | 'closed' } | null {
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  if (dow === 0) return { dateInWeek: today, kind: 'closing' };
  if (dow === 1) return { dateInWeek: addDaysToDateString(today, -1), kind: 'closed' };
  return null;
}
