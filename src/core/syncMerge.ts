import { UserProfile, Mission, UserChallenge, DayRecord } from './types';
import { mergeLedgers, deriveTotals, LedgerState } from './ledger';
import { mergeDayLogs } from './dayLog';
import { isValidDateString } from './dateUtils';
import { mergeChallengeLists, mergeHabitLinks } from './challenges';
import { mergeMeasures } from './measures';

/**
 * MESCLAGEM ENTRE APARELHOS
 * ─────────────────────────────────────────────────────────────
 * Sincronizar NÃO é "o mais recente sobrescreve o outro". Cada tipo de
 * dado tem a sua regra, e nenhuma delas perde progresso:
 *
 *  - Livro-razão (XP/Ryō)     união dos lançamentos + estornos
 *  - Datas das missões        união, respeitando o que foi desmarcado
 *  - Registro diário          por dia: um dia cumprido nunca vira falta
 *  - Escudos, compras         união
 *  - Desafios                 por id; definição/decisão mais recente vence;
 *                              marcações do quadro, célula a célula
 *  - Vínculo hábito → desafio  o mais recente vence
 *  - Preferências e textos    vence o lado editado por último
 *  - Reset completo           o reset mais recente vence por inteiro
 *
 * A função é pura e idempotente: mesclar de novo o resultado com qualquer
 * um dos lados não muda nada (é isso que impede laços de sincronização).
 */

export interface SyncSnapshot {
  profile: UserProfile;
  missions: Mission[];
  challenges: UserChallenge[];
  /** Vida atual dos adversários já atingidos (id → HP). */
  bossHp: Record<string, number>;
}

export interface MergeOptions {
  /**
   * 'union'   — missões dos dois lados são mantidas (exclusões viajam como lápides).
   * 'primary' — vale a lista do lado mais recente. Usado só na primeira
   *             sincronização após a migração, quando ainda não existiam lápides.
   */
  missionList?: 'union' | 'primary';
  /** Instante usado para registrar lápides criadas pela própria mesclagem. */
  now?: string;
}

type Stamps = Record<string, string>;

const mergeStamps = (a: Stamps = {}, b: Stamps = {}): Stamps => {
  const out: Stamps = { ...a };
  Object.entries(b).forEach(([key, at]) => {
    if (!out[key] || at > out[key]) out[key] = at;
  });
  return out;
};

const union = (a: string[] = [], b: string[] = []): string[] => Array.from(new Set([...a, ...b])).sort();

/** Ordenação canônica de chaves — comparações estáveis independentes da origem do objeto. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          const v = (val as Record<string, unknown>)[k];
          if (v !== undefined && v !== null) acc[k] = v;
          return acc;
        }, {});
    }
    return val;
  });
}

// ── Missões ──────────────────────────────────────────────────

/** Chaves que registram a marcação de uma missão em uma data: `mission:<id>:<data>` e `retro:<id>:<data>`. */
function parseMarkKey(key: string): { missionId: string; date: string } | null {
  const prefix = key.startsWith('mission:') ? 'mission:' : key.startsWith('retro:') ? 'retro:' : null;
  if (!prefix) return null;
  const cut = key.lastIndexOf(':');
  const date = key.slice(cut + 1);
  const missionId = key.slice(prefix.length, cut);
  return missionId && isValidDateString(date) ? { missionId, date } : null;
}

export function mergeMissions(
  local: Mission[],
  cloud: Mission[],
  preferCloud: boolean,
  ledger: LedgerState,
  deletedMissions: Stamps,
  options: MergeOptions = {}
): { missions: Mission[]; deletedMissions: Stamps } {
  const primary = preferCloud ? cloud : local;
  const secondary = preferCloud ? local : cloud;
  const primaryIds = new Set(primary.map((m) => m.id));
  const secondaryById = new Map(secondary.map((m) => [m.id, m]));
  const deleted: Stamps = { ...deletedMissions };
  const now = options.now || new Date().toISOString();

  // O que o livro-razão diz sobre cada (missão, data): vale a operação mais recente
  const latest = new Map<string, { missionId: string; date: string; at: string; done: boolean }>();
  const consider = (key: string, at: string, done: boolean) => {
    const parsed = parseMarkKey(key);
    if (!parsed) return;
    const id = `${parsed.missionId}|${parsed.date}`;
    const current = latest.get(id);
    if (!current || at > current.at) latest.set(id, { ...parsed, at, done });
  };
  Object.entries(ledger.grants).forEach(([key, grant]) => consider(key, grant.createdAt || '', true));
  Object.entries(ledger.revoked).forEach(([key, at]) => {
    if (!ledger.grants[key]) consider(key, at, false);
  });
  const granted = new Map<string, Set<string>>();
  const removed = new Map<string, Set<string>>();
  latest.forEach(({ missionId, date, done }) => {
    const bucket = done ? granted : removed;
    if (!bucket.has(missionId)) bucket.set(missionId, new Set());
    bucket.get(missionId)!.add(date);
  });

  // Uma missão recriada depois de excluída tem data de criação posterior à lápide
  const createdAtOf = (m: Mission): string => {
    const other = secondaryById.get(m.id)?.createdAt || '';
    return other > (m.createdAt || '') ? other : m.createdAt || '';
  };
  const isDeleted = (m: Mission) => Boolean(deleted[m.id]) && deleted[m.id] >= createdAtOf(m);

  const candidates: Mission[] = [...primary];
  secondary.forEach((m) => {
    if (primaryIds.has(m.id)) return;
    if (options.missionList === 'primary') {
      // Lista do lado mais recente vale; a sobra é tratada como excluída
      if (!isDeleted(m)) deleted[m.id] = now;
      return;
    }
    candidates.push(m);
  });

  const missions = candidates
    .filter((m) => !isDeleted(m))
    .map((m, idx) => {
      const other = secondaryById.get(m.id);
      const dates = new Set([...(m.completedDates || []), ...(other?.completedDates || [])]);
      granted.get(m.id)?.forEach((d) => dates.add(d));
      removed.get(m.id)?.forEach((d) => dates.delete(d));
      return { ...m, createdAt: createdAtOf(m), order: idx + 1, completedDates: Array.from(dates).filter(isValidDateString).sort() };
    });

  return { missions, deletedMissions: deleted };
}

// ── Perfil ───────────────────────────────────────────────────

function withoutWiped<T extends { dayLog: Record<string, DayRecord>; shieldedDates: string[]; dayWipe?: UserProfile['dayWipe'] }>(
  side: T,
  wipe: UserProfile['dayWipe']
): { dayLog: Record<string, DayRecord>; shieldedDates: string[] } {
  if (!wipe || side.dayWipe?.at === wipe.at) return { dayLog: side.dayLog || {}, shieldedDates: side.shieldedDates || [] };
  // Este lado ainda não sabia que os dias a partir de `wipe.from` foram apagados
  return {
    dayLog: Object.fromEntries(Object.entries(side.dayLog || {}).filter(([date]) => date < wipe.from)),
    shieldedDates: (side.shieldedDates || []).filter((date) => date < wipe.from),
  };
}

export function mergeSnapshots(local: SyncSnapshot, cloud: SyncSnapshot, options: MergeOptions = {}): SyncSnapshot {
  const lp = local.profile;
  const cp = cloud.profile;
  const now = options.now || new Date().toISOString();

  // 0. Reset completo: vence o mais recente, sem misturar nada do outro lado
  const localEpoch = lp.resetEpoch || '';
  const cloudEpoch = cp.resetEpoch || '';
  if (localEpoch !== cloudEpoch) return localEpoch > cloudEpoch ? local : cloud;

  const preferCloud = !lp.hasCompletedOnboarding || (cp.updatedAt || '') > (lp.updatedAt || '');
  const primary = preferCloud ? cloud : local;
  const pp = primary.profile;

  // 1. Fatos mescláveis
  const ledger = mergeLedgers({ grants: lp.grants || {}, revoked: lp.revoked || {} }, { grants: cp.grants || {}, revoked: cp.revoked || {} });
  const deletedCycles = mergeStamps(lp.deletedCycles, cp.deletedCycles);
  const dayWipe = (lp.dayWipe?.at || '') >= (cp.dayWipe?.at || '') ? lp.dayWipe : cp.dayWipe;

  const localDays = withoutWiped(lp, dayWipe);
  const cloudDays = withoutWiped(cp, dayWipe);
  const dayLog = mergeDayLogs(localDays.dayLog, cloudDays.dayLog);
  const shieldedDates = union(localDays.shieldedDates, cloudDays.shieldedDates).filter(isValidDateString);

  const { missions, deletedMissions } = mergeMissions(
    local.missions,
    cloud.missions,
    preferCloud,
    ledger,
    mergeStamps(lp.deletedMissions, cp.deletedMissions),
    { ...options, now }
  );

  const totals = deriveTotals(ledger.grants);

  // 2. Preferências: lado editado por último; o resto: união / máximo
  const profile: UserProfile = {
    ...pp,
    id: cp.id || lp.id,
    email: pp.email || lp.email || cp.email,
    whatsapp: pp.whatsapp || lp.whatsapp || cp.whatsapp,
    hasCompletedOnboarding: lp.hasCompletedOnboarding || cp.hasCompletedOnboarding,
    createdAt: [lp.createdAt, cp.createdAt].filter(Boolean).sort()[0] || pp.createdAt,
    updatedAt: (lp.updatedAt || '') > (cp.updatedAt || '') ? lp.updatedAt : cp.updatedAt || lp.updatedAt,
    resetEpoch: lp.resetEpoch,

    grants: ledger.grants,
    revoked: ledger.revoked,
    ...totals,

    dayLog,
    shieldedDates,
    shieldsThrough: [lp.shieldsThrough, cp.shieldsThrough].filter(isValidDateString).sort().pop(),
    dayWipe,
    measures: mergeMeasures(lp.measures, cp.measures),
    habitLinks: mergeHabitLinks(lp.habitLinks, cp.habitLinks),
    deletedMissions,
    deletedCycles,

    // Formato antigo: os ciclos já foram convertidos em desafios (ver normalizeChallengeData)
    activeChallenge: undefined,
    challengeHistory: [],

    purchasedItems: union(lp.purchasedItems, cp.purchasedItems),
    extraShieldWeeks: union(lp.extraShieldWeeks, cp.extraShieldWeeks),
    soldierPillDates: union(lp.soldierPillDates, cp.soldierPillDates),
    bestStreak: Math.max(lp.bestStreak || 0, cp.bestStreak || 0),
    missionsCompletedTotal: Math.max(lp.missionsCompletedTotal || 0, cp.missionsCompletedTotal || 0),
    lastActiveDate: [lp.lastActiveDate, cp.lastActiveDate].filter(isValidDateString).sort().pop() || pp.lastActiveDate,
  };

  return {
    profile,
    missions,
    challenges: mergeChallengeLists(local.challenges, cloud.challenges, deletedCycles),
    bossHp: primary.bossHp,
  };
}
