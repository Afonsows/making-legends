import { ChallengeState, HabitLink, Mission, ProtocolChallengeCycle, UserChallenge } from './types';
import { addDaysToDateString, daysBetween, getTodayString, isValidDateString, localDateFromIso } from './dateUtils';
import { boardDayProgress, isBoard } from './board';
import { getCycleGraceBefore, isUserEndedCycle } from './cycle';
import { shinobiTheme } from '../theme/shinobi.theme';

/**
 * DESAFIOS — MODELO ÚNICO
 * ─────────────────────────────────────────────────────────────
 * Um desafio guarda só a DEFINIÇÃO (título, início, duração, regras) e as
 * DECISÕES do shinobi (encerrar). Tudo o mais é calculado aqui, a partir
 * das marcações: dia atual, dias cumpridos, faltas, adesão e o estado.
 *
 *  - Hábitos são missões. Cada missão aponta para o seu desafio por um
 *    vínculo (`HabitLink`); sem desafio, é um hábito avulso.
 *  - Faltas acima da tolerância NÃO encerram o desafio: aparecem como faltas
 *    e pesam na adesão. Só o Modo Elite encerra (na primeira falta).
 *  - Quando o desafio termina, os hábitos dele saem da tela Hoje — o
 *    histórico fica guardado no próprio desafio.
 *
 * Como nada disso é gravado, dados que chegam atrasados de outro aparelho
 * corrigem o resultado sozinhos, e avaliar duas vezes dá sempre o mesmo.
 */

export const CHALLENGE_MODEL_VERSION = 2;
export const MIN_CHALLENGE_DAYS = 7;
export const MAX_CHALLENGE_DAYS = 365;
/** Meta padrão de um desafio de hábitos: 50% do XP previsto do dia. */
export const HABITS_DEFAULT_GOAL_PCT = 50;

export type HabitLinks = Record<string, HabitLink>;
export type ChallengeIndex = Map<string, UserChallenge>;

export const indexChallenges = (list: UserChallenge[]): ChallengeIndex => new Map((list || []).map((c) => [c.id, c]));

export const clampTargetDays = (days: number): number =>
  Math.min(MAX_CHALLENGE_DAYS, Math.max(MIN_CHALLENGE_DAYS, Math.round(Number(days) || 30)));

// ─────────────────────────────────────────────────────────────
// Datas do desafio
// ─────────────────────────────────────────────────────────────

export function challengeEndDate(c: Pick<UserChallenge, 'startDate' | 'targetDays'>): string {
  return addDaysToDateString(c.startDate, Math.max(1, Math.round(c.targetDays || 1)) - 1);
}

/** Último dia que conta: o fim previsto ou o dia em que o shinobi encerrou. */
export function lastCountedDate(c: Pick<UserChallenge, 'startDate' | 'targetDays' | 'closedOn'>): string {
  const end = challengeEndDate(c);
  return c.closedOn && c.closedOn < end ? c.closedOn : end;
}

export function isDateInChallenge(c: Pick<UserChallenge, 'startDate' | 'targetDays' | 'closedOn'>, date: string): boolean {
  return date >= c.startDate && date <= lastCountedDate(c);
}

/** Primeiro dia que pode contar como falta (o dia de criação nunca conta). */
export function challengeGraceBefore(c: UserChallenge): string | undefined {
  return getCycleGraceBefore({
    startDate: c.startDate,
    createdAt: c.createdAt,
    createdOn: c.createdOn,
    graceBefore: c.graceBefore,
  });
}

export type ChallengePhase = 'Despertar' | 'Forja' | 'Mestria';

export function challengePhase(dayNumber: number, targetDays: number): { index: 1 | 2 | 3; name: ChallengePhase } {
  const third = Math.max(1, Math.ceil(targetDays / 3));
  if (dayNumber <= third) return { index: 1, name: 'Despertar' };
  if (dayNumber <= third * 2) return { index: 2, name: 'Forja' };
  return { index: 3, name: 'Mestria' };
}

// ─────────────────────────────────────────────────────────────
// Hábitos (missões) e seus vínculos
// ─────────────────────────────────────────────────────────────

export const habitChallengeId = (links: HabitLinks | undefined, missionId: string): string | null =>
  links?.[missionId]?.challengeId ?? null;

/**
 * O hábito vale nesta data?
 *  - não antes de existir (salvo se foi marcado nesse dia);
 *  - não depois de retirado (`until`);
 *  - se pertence a um desafio, só dentro dos dias que contam desse desafio.
 */
export function habitActiveOn(mission: Mission, links: HabitLinks | undefined, index: ChallengeIndex, date: string): boolean {
  const link = links?.[mission.id];
  if (link?.until && date > link.until) return false;
  const marked = (mission.completedDates || []).includes(date);
  const created = localDateFromIso(mission.createdAt);
  if (!marked && created && date < created) return false;
  const challengeId = link?.challengeId;
  if (!challengeId) return true;
  const challenge = index.get(challengeId);
  return Boolean(challenge) && isDateInChallenge(challenge!, date);
}

export function activeMissionsOn(missions: Mission[], links: HabitLinks | undefined, index: ChallengeIndex, date: string): Mission[] {
  return (missions || []).filter((m) => habitActiveOn(m, links, index, date));
}

/** Hábitos de um desafio (inclusive os retirados, que guardam o histórico). */
export function missionsOfChallenge(challengeId: string, missions: Mission[], links: HabitLinks | undefined): Mission[] {
  return (missions || []).filter((m) => links?.[m.id]?.challengeId === challengeId);
}

/** Hábitos avulsos (fora de qualquer desafio). */
export function looseMissions(missions: Mission[], links: HabitLinks | undefined): Mission[] {
  return (missions || []).filter((m) => !links?.[m.id]?.challengeId);
}

// ─────────────────────────────────────────────────────────────
// O dia de um desafio
// ─────────────────────────────────────────────────────────────

export interface ChallengeContext {
  missions: Mission[];
  links: HabitLinks | undefined;
  index: ChallengeIndex;
}

/**
 * Contexto de avaliação. No índice, um desafio do Modo Elite que caiu por uma
 * falta já vem "cortado" no dia da falta (como se tivesse sido encerrado ali):
 * os hábitos dele deixam de valer dali em diante — saem de Hoje e da meta do dia.
 */
export function makeChallengeContext(
  challenges: UserChallenge[],
  missions: Mission[],
  links: HabitLinks | undefined,
  today: string = getTodayString()
): ChallengeContext {
  const base: ChallengeContext = { missions: missions || [], links, index: indexChallenges(challenges) };
  const elite = (challenges || []).filter((c) => c.isEliteMode && !c.closedAt);
  if (elite.length === 0) return base;
  const index = new Map(base.index);
  elite.forEach((c) => {
    const failedOn = eliteFailedOn(c, base, today);
    if (failedOn) index.set(c.id, { ...c, closedOn: failedOn });
  });
  return { ...base, index };
}

/** Modo Elite: o primeiro dia já encerrado, depois da carência, que não foi cumprido. */
function eliteFailedOn(c: UserChallenge, ctx: ChallengeContext, today: string): string | undefined {
  const grace = challengeGraceBefore(c);
  const last = lastCountedDate(c);
  for (let date = c.startDate; date < today && date <= last; date = addDaysToDateString(date, 1)) {
    if (grace && date < grace) continue;
    if (!challengeDay(c, ctx, date).completed) return date;
  }
  return undefined;
}

export interface ChallengeDay {
  date: string;
  /** Tarefas/hábitos feitos e previstos no dia (para desafios de hábitos: só os que valem no dia). */
  done: number;
  total: number;
  /** % da meta do dia percorrida pela régua do desafio (XP para hábitos, tarefas para quadro). */
  pct: number;
  completed: boolean;
  /** Desafios de hábitos: XP feito, previsto e necessário para o dia contar. */
  earnedXp?: number;
  targetXp?: number;
  neededXp?: number;
}

export const habitsGoalPctOf = (c: Pick<UserChallenge, 'dailyGoalPct'>): number => {
  const pct = Math.round(Number(c.dailyGoalPct));
  return pct >= 1 && pct <= 100 ? pct : HABITS_DEFAULT_GOAL_PCT;
};

export function challengeDay(c: UserChallenge, ctx: ChallengeContext, date: string): ChallengeDay {
  if (isBoard(c)) {
    const p = boardDayProgress(c, date);
    return { date, done: p.done, total: p.total, pct: p.pct, completed: p.completed };
  }
  const habits = missionsOfChallenge(c.id, ctx.missions, ctx.links).filter((m) => habitActiveOn(m, ctx.links, ctx.index, date));
  const marked = habits.filter((m) => (m.completedDates || []).includes(date));
  const targetXp = habits.reduce((acc, m) => acc + Math.max(0, m.xpReward || 0), 0);
  const earnedXp = marked.reduce((acc, m) => acc + Math.max(0, m.xpReward || 0), 0);
  const neededXp = Math.ceil((targetXp * habitsGoalPctOf(c)) / 100);
  return {
    date,
    done: marked.length,
    total: habits.length,
    pct: targetXp > 0 ? Math.min(100, Math.round((earnedXp / targetXp) * 100)) : 0,
    completed: targetXp > 0 && earnedXp >= neededXp,
    earnedXp,
    targetXp,
    neededXp,
  };
}

// ─────────────────────────────────────────────────────────────
// Estado e indicadores
// ─────────────────────────────────────────────────────────────

export type ChallengeDayStatus = 'done' | 'missed' | 'grace' | 'today' | 'future' | 'closed';

export interface ChallengeMapDay {
  date: string;
  dayNumber: number;
  status: ChallengeDayStatus;
  pct: number;
}

export interface ChallengeStats {
  state: ChallengeState;
  /** Dia corrente (0 = ainda não começou; no fim fica na duração). */
  dayNumber: number;
  targetDays: number;
  phase: ChallengePhase;
  phaseIndex: 1 | 2 | 3;
  timePct: number;
  remaining: number;
  daysUntilStart: number;
  endDate: string;
  lastDate: string;
  daysCompleted: number;
  daysMissed: number;
  /** % dos dias já encerrados (hoje entra se já foi cumprido) que foram cumpridos. */
  adherence: number;
  streak: number;
  bestStreak: number;
  week: number;
  totalWeeks: number;
  missesThisWeek: number;
  /** Modo Elite: dia da falta que encerrou o desafio. */
  failedOn?: string;
  /** Concluído por ter chegado ao fim (é o que paga o bônus). */
  finishedNaturally: boolean;
  today: ChallengeDay;
  days: ChallengeMapDay[];
}

export function challengeStats(c: UserChallenge, ctx: ChallengeContext, today: string): ChallengeStats {
  const targetDays = Math.max(1, Math.round(c.targetDays || 1));
  const endDate = challengeEndDate(c);
  const lastDate = lastCountedDate(c);
  const graceBefore = challengeGraceBefore(c);
  const rawDay = daysBetween(c.startDate, today) + 1;
  const dayNumber = Math.max(0, Math.min(targetDays, rawDay));

  let daysCompleted = 0;
  let daysMissed = 0;
  let counted = 0;
  let run = 0;
  let bestStreak = 0;
  let failedOn: string | undefined;
  const days: ChallengeMapDay[] = [];

  for (let n = 1; n <= targetDays; n++) {
    const date = addDaysToDateString(c.startDate, n - 1);
    if (date > lastDate) {
      days.push({ date, dayNumber: n, status: date > today ? 'future' : 'closed', pct: 0 });
      continue;
    }
    if (date > today) {
      days.push({ date, dayNumber: n, status: 'future', pct: 0 });
      continue;
    }
    if (failedOn) {
      days.push({ date, dayNumber: n, status: 'closed', pct: 0 }); // depois da falta que encerrou (Modo Elite)
      continue;
    }
    const day = challengeDay(c, ctx, date);
    let status: ChallengeDayStatus;
    if (day.completed) {
      status = 'done';
      daysCompleted++;
      counted++;
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else if (date === today) {
      status = 'today'; // em andamento: não é falta e não quebra a sequência
    } else if (graceBefore && date < graceBefore) {
      status = 'grace'; // antes de o desafio existir de fato: neutro
    } else {
      status = 'missed';
      daysMissed++;
      counted++;
      run = 0;
      if (c.isEliteMode && !failedOn) failedOn = date;
    }
    days.push({ date, dayNumber: n, status, pct: day.pct });
  }

  const week = Math.max(1, Math.ceil(Math.max(1, dayNumber) / 7));
  const weekStart = (week - 1) * 7 + 1;
  const missesThisWeek = days.filter((d) => d.dayNumber >= weekStart && d.dayNumber <= week * 7 && d.status === 'missed').length;

  let state: ChallengeState;
  if (c.closedAt) state = c.closeKind === 'completed' ? 'completed' : 'abandoned';
  else if (failedOn) state = 'failed';
  else if (today < c.startDate) state = 'scheduled';
  else if (today > endDate) state = 'completed';
  else state = 'active';

  const phase = challengePhase(Math.max(1, dayNumber), targetDays);
  const running = today >= c.startDate && today <= lastDate && !failedOn;
  const todayDay = running ? challengeDay(c, ctx, today) : { date: today, done: 0, total: 0, pct: 0, completed: false };

  return {
    state,
    dayNumber,
    targetDays,
    phase: phase.name,
    phaseIndex: phase.index,
    timePct: Math.min(100, Math.round((dayNumber / targetDays) * 100)),
    remaining: Math.max(0, targetDays - dayNumber),
    daysUntilStart: today < c.startDate ? daysBetween(today, c.startDate) : 0,
    endDate,
    lastDate,
    daysCompleted,
    daysMissed,
    adherence: counted > 0 ? Math.round((daysCompleted / counted) * 100) : 0,
    streak: run,
    bestStreak,
    week: Math.min(week, Math.max(1, Math.ceil(targetDays / 7))),
    totalWeeks: Math.max(1, Math.ceil(targetDays / 7)),
    missesThisWeek,
    failedOn,
    finishedNaturally: state === 'completed' && !c.closedAt,
    today: todayDay,
    days,
  };
}

/** Só o estado (atalho). */
export function challengeState(c: UserChallenge, ctx: ChallengeContext, today: string): ChallengeState {
  if (c.closedAt) return c.closeKind === 'completed' ? 'completed' : 'abandoned';
  return challengeStats(c, ctx, today).state;
}

/** Em curso ou agendado: é o que aparece na tela Hoje e em "Em andamento". */
export const isOpenState = (state: ChallengeState): boolean => state === 'active' || state === 'scheduled';

/** Espelho do estado no campo antigo `status` (telas e quadro de operação). */
export function legacyStatusOf(state: ChallengeState): UserChallenge['status'] {
  if (state === 'active' || state === 'scheduled') return 'active';
  if (state === 'completed') return 'completed';
  return 'archived';
}

export const challengeRewardKey = (challengeId: string) => `challenge:${challengeId}`;

export function getChallengeCompletionReward(targetDays: number): { xp: number; ryo: number } {
  return { xp: targetDays * 10, ryo: targetDays * 15 };
}

// ─────────────────────────────────────────────────────────────
// Conversão do formato antigo (idempotente)
// ─────────────────────────────────────────────────────────────

const RANK_E = shinobiTheme.missionRanks.E;

/** Ciclo do antigo "desafio principal" → desafio do modelo único. */
export function cycleToChallenge(cycle: ProtocolChallengeCycle): UserChallenge {
  const targetDays = Math.max(1, Math.round(cycle.targetDays || 66));
  const userEnded = cycle.status === 'failed' && isUserEndedCycle(cycle);
  const closedOn = cycle.endDate && isValidDateString(cycle.endDate) ? cycle.endDate : cycle.startDate;
  return {
    v: CHALLENGE_MODEL_VERSION,
    id: cycle.id,
    title: cycle.title?.trim() || `Desafio ${targetDays} dias`,
    category: 'Hábitos',
    targetDays,
    startDate: cycle.startDate,
    status: 'active',
    habits: [],
    createdAt: cycle.createdAt,
    format: 'habits',
    isEliteMode: Boolean(cycle.isEliteMode),
    ...(cycle.createdOn ? { createdOn: cycle.createdOn } : {}),
    ...(cycle.graceBefore ? { graceBefore: cycle.graceBefore } : {}),
    ...(cycle.cycleNumber ? { cycleNumber: cycle.cycleNumber } : {}),
    // Encerramento pela antiga regra de faltas é derivado e deixa de valer;
    // encerramento pelo próprio shinobi é decisão e é mantido.
    ...(userEnded ? { closedAt: `${closedOn}T23:59:59.000Z`, closedOn, closeKind: 'abandoned' as const } : {}),
    ...(cycle.rewardXp !== undefined ? { rewardXp: cycle.rewardXp } : {}),
    ...(cycle.rewardRyo !== undefined ? { rewardRyo: cycle.rewardRyo } : {}),
    updatedAt: '',
  };
}

/** Desafio personalizado antigo → modelo único; os hábitos dele viram missões. */
export function normalizeCustomChallenge(c: UserChallenge): { challenge: UserChallenge; missions: Mission[]; links: HabitLinks } {
  if (c.v === CHALLENGE_MODEL_VERSION) return { challenge: c, missions: [], links: {} };

  const board = isBoard(c);
  const end = challengeEndDate(c);
  let closed: Partial<UserChallenge> = {};
  if (c.status === 'completed') {
    // "Marcar como concluído" antes do fim era uma decisão; depois do fim, só o tempo passando
    const doneOn = localDateFromIso(c.completedAt);
    if (doneOn && doneOn < end) closed = { closedAt: c.completedAt, closedOn: doneOn, closeKind: 'completed' };
  } else if (c.status === 'archived') {
    const on = localDateFromIso(c.completedAt) || c.startDate;
    closed = { closedAt: c.completedAt || `${on}T23:59:59.000Z`, closedOn: on, closeKind: 'abandoned' };
  }

  const missions: Mission[] = board
    ? []
    : (c.habits || []).map((h, i) => ({
        id: h.id,
        title: h.title,
        description: h.description || undefined,
        pillarId: h.pillarId || 'chakra',
        rank: 'E',
        xpReward: RANK_E.xpReward,
        ryoReward: RANK_E.ryoReward,
        timeOfDay: 'anytime',
        isCompletedToday: false,
        completedDates: Array.from(new Set((h.completedDates || []).filter(isValidDateString))).sort(),
        isCustom: true,
        order: 1000 + i,
        createdAt: h.createdAt || c.createdAt,
      }));
  const links: HabitLinks = Object.fromEntries(missions.map((m) => [m.id, { challengeId: c.id, at: '' }]));

  const challenge: UserChallenge = {
    ...c,
    v: CHALLENGE_MODEL_VERSION,
    format: board ? 'board' : 'habits',
    habits: [],
    status: 'active',
    endDate: undefined,
    completedAt: undefined,
    createdOn: c.createdOn || localDateFromIso(c.createdAt),
    ...closed,
    updatedAt: c.updatedAt || '',
  };
  delete challenge.endDate;
  delete challenge.completedAt;
  if (!challenge.createdOn) delete challenge.createdOn;
  return { challenge, missions, links };
}

export interface ChallengeData {
  challenges: UserChallenge[];
  missions: Mission[];
  links: HabitLinks;
}

/**
 * Junta tudo no modelo único: desafios personalizados (antigos ou novos),
 * ciclos do antigo desafio principal e o vínculo de cada missão.
 * Rodar de novo sobre o resultado não muda nada.
 *
 * Missões sem vínculo (do formato antigo) passam a pertencer ao último ciclo
 * ainda em curso; sem ciclo em curso, viram hábitos avulsos.
 */
export function normalizeChallengeData(input: {
  challenges?: UserChallenge[];
  missions?: Mission[];
  links?: HabitLinks;
  activeCycle?: ProtocolChallengeCycle;
  cycleHistory?: ProtocolChallengeCycle[];
  today: string;
}): ChallengeData {
  const byId = new Map<string, UserChallenge>();
  const links: HabitLinks = { ...(input.links || {}) };
  const missions: Mission[] = [...(input.missions || [])];
  const missionIds = new Set(missions.map((m) => m.id));

  (input.challenges || [])
    .filter((c) => c && c.id && !c.isOfficial66 && c.id !== 'challenge_official_66')
    .forEach((raw) => {
      const { challenge, missions: extra, links: extraLinks } = normalizeCustomChallenge(raw);
      const existing = byId.get(challenge.id);
      byId.set(challenge.id, existing ? mergeChallenge(existing, challenge) : challenge);
      extra.forEach((m) => {
        if (missionIds.has(m.id)) return;
        missionIds.add(m.id);
        missions.push(m);
      });
      Object.entries(extraLinks).forEach(([id, link]) => {
        if (!links[id]) links[id] = link;
      });
    });

  const cycles = [input.activeCycle, ...(input.cycleHistory || [])].filter(
    (c): c is ProtocolChallengeCycle => Boolean(c && c.id && isValidDateString(c.startDate))
  );
  cycles.map(cycleToChallenge).forEach((c) => {
    // O registro do modelo novo (se já existir) vence a conversão
    if (!byId.has(c.id)) byId.set(c.id, c);
  });

  // Ciclo "atual": o mais recente, não encerrado pelo shinobi e ainda dentro do prazo
  const current = cycles
    .map((c) => byId.get(c.id)!)
    .filter((c) => c && !c.closedAt && input.today <= challengeEndDate(c))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  missions.forEach((m) => {
    if (!links[m.id]) links[m.id] = { challengeId: current ? current.id : null, at: '' };
  });

  return { challenges: sortChallenges(Array.from(byId.values())), missions, links };
}

// ─────────────────────────────────────────────────────────────
// Mesclagem entre aparelhos
// ─────────────────────────────────────────────────────────────

const META_SKIP = new Set(['marks', 'cellStamps', 'status']);

function metaKey(c: UserChallenge): string {
  return JSON.stringify(
    Object.keys(c)
      .filter((k) => !META_SKIP.has(k))
      .sort()
      .map((k) => [k, (c as unknown as Record<string, unknown>)[k]])
  );
}

export function sortChallenges(list: UserChallenge[]): UserChallenge[] {
  return [...list].sort((a, b) =>
    (a.createdAt || '') < (b.createdAt || '') ? 1 : (a.createdAt || '') > (b.createdAt || '') ? -1 : a.id < b.id ? 1 : -1
  );
}

type CellStamp = { on: boolean; at: string };

function mergeStamps(a: Record<string, CellStamp> = {}, b: Record<string, CellStamp> = {}): Record<string, CellStamp> {
  const out: Record<string, CellStamp> = { ...a };
  Object.entries(b).forEach(([key, stamp]) => {
    const current = out[key];
    if (!current || stamp.at > current.at || (stamp.at === current.at && stamp.on && !current.on)) out[key] = stamp;
  });
  return out;
}

/** Marcações do quadro: união do que veio sem registro (formato antigo) + o registro mais recente de cada célula. */
export function marksFromStamps(
  legacyA: Record<string, string[]> = {},
  legacyB: Record<string, string[]> = {},
  stamps: Record<string, CellStamp> = {}
): Record<string, string[]> {
  const sets = new Map<string, Set<string>>();
  const add = (date: string, key: string) => {
    if (!sets.has(date)) sets.set(date, new Set());
    sets.get(date)!.add(key);
  };
  [legacyA, legacyB].forEach((marks) => Object.entries(marks).forEach(([date, keys]) => (keys || []).forEach((k) => add(date, k))));
  Object.entries(stamps).forEach(([id, stamp]) => {
    const cut = id.indexOf('|');
    if (cut < 0) return;
    const date = id.slice(0, cut);
    const key = id.slice(cut + 1);
    if (stamp.on) add(date, key);
    else sets.get(date)?.delete(key);
  });
  const out: Record<string, string[]> = {};
  Array.from(sets.keys())
    .sort()
    .forEach((date) => {
      const keys = Array.from(sets.get(date)!).sort();
      if (keys.length > 0) out[date] = keys;
    });
  return out;
}

/** O mesmo desafio visto por dois aparelhos: definição/decisão mais recente vence; marcações do quadro, célula a célula. */
export function mergeChallenge(a: UserChallenge, b: UserChallenge): UserChallenge {
  const ua = a.updatedAt || '';
  const ub = b.updatedAt || '';
  const newer = ua !== ub ? (ua > ub ? a : b) : metaKey(a) >= metaKey(b) ? a : b;
  const merged: UserChallenge = { ...newer };
  if (isBoard(a) || isBoard(b) || a.marks || b.marks) {
    const stamps = mergeStamps(a.cellStamps, b.cellStamps);
    merged.cellStamps = Object.keys(stamps).length > 0 ? stamps : undefined;
    if (!merged.cellStamps) delete merged.cellStamps;
    merged.marks = marksFromStamps(a.marks, b.marks, stamps);
  }
  return merged;
}

/** Listas de dois aparelhos: união por id, sem os desafios excluídos. */
export function mergeChallengeLists(a: UserChallenge[], b: UserChallenge[], deleted: Record<string, string> = {}): UserChallenge[] {
  const byId = new Map<string, UserChallenge>();
  [...(a || []), ...(b || [])].forEach((c) => {
    if (!c || !c.id) return;
    const current = byId.get(c.id);
    byId.set(c.id, current ? mergeChallenge(current, c) : c);
  });
  return sortChallenges(
    Array.from(byId.values()).filter((c) => !(deleted[c.id] && deleted[c.id] >= (c.createdAt || '')))
  );
}

export function mergeHabitLinks(a: HabitLinks = {}, b: HabitLinks = {}): HabitLinks {
  const out: HabitLinks = { ...a };
  Object.entries(b).forEach(([id, link]) => {
    const current = out[id];
    if (!current) {
      out[id] = link;
      return;
    }
    const ca = current.at || '';
    const cb = link.at || '';
    if (cb !== ca) {
      if (cb > ca) out[id] = link;
      return;
    }
    // Empate (ex.: duas conversões do formato antigo): o vínculo com desafio vence o "avulso"
    if (Boolean(link.challengeId) !== Boolean(current.challengeId)) {
      if (link.challengeId) out[id] = link;
      return;
    }
    if (JSON.stringify(link) > JSON.stringify(current)) out[id] = link;
  });
  return out;
}
