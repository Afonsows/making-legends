import { RewardGrant } from './types';
import { PillarId, UserRankId } from '../theme/types';
import { getLevelFromTotalXp, getRankIdFromLevel } from './xpEngine';
import { getLevelUpRyoBetween } from './ryoEngine';
import { addDaysToDateString } from './dateUtils';

/**
 * LIVRO-RAZÃO DE RECOMPENSAS
 * ─────────────────────────────────────────────────────────────
 * Toda variação de XP e Ryō é um lançamento com chave única
 * (`mission:<id>:<data>`, `checkin:<data>`, `shop:pill:<data>`...).
 * XP total, XP por pilar, nível, patente e Ryō NUNCA são somados
 * "na mão": são sempre recalculados a partir dos lançamentos.
 *
 * Isso torna impossível o saldo "desandar":
 *  - conceder duas vezes a mesma chave não faz nada;
 *  - estornar devolve exatamente o que foi dado;
 *  - dois aparelhos se juntam por união dos lançamentos.
 */

export type Ledger = Record<string, RewardGrant>;
/** Chave do lançamento → instante (ISO) em que foi estornado. */
export type Tombstones = Record<string, string>;

export interface LedgerState {
  grants: Ledger;
  revoked: Tombstones;
}

export const LEGACY_BASE_KEY = 'legacy:base';
export const DAY_SUMMARY_PREFIX = 'day:';
/** Lançamentos mais antigos que isso viram um resumo por dia (economiza espaço). */
export const LEDGER_COMPACT_AFTER_DAYS = 90;
/** Estornos são lembrados por este período para sincronizar outros aparelhos. */
export const TOMBSTONE_TTL_DAYS = 60;

const PILLARS: PillarId[] = ['taijutsu', 'ninjutsu', 'chakra', 'espirito', 'genjutsu'];

export const emptyPillarXp = (): Record<PillarId, number> => ({
  taijutsu: 0,
  ninjutsu: 0,
  chakra: 0,
  espirito: 0,
  genjutsu: 0,
});

export interface DerivedTotals {
  totalXp: number;
  pillarXp: Record<PillarId, number>;
  level: number;
  currentRankId: UserRankId;
  ryo: number;
}

/** Soma do Ryō de promoção de todos os níveis já alcançados. */
export function getLevelUpRyoTotal(level: number): number {
  return getLevelUpRyoBetween(1, level);
}

/** Recalcula XP, pilares, nível, patente e Ryō a partir do livro-razão. */
export function deriveTotals(grants: Ledger): DerivedTotals {
  let xp = 0;
  let ryo = 0;
  const pillarXp = emptyPillarXp();

  Object.values(grants || {}).forEach((g) => {
    if (!g) return;
    xp += g.xp || 0;
    ryo += g.ryo || 0;
    if (g.pillarXp) {
      PILLARS.forEach((p) => (pillarXp[p] += g.pillarXp?.[p] || 0));
    } else if (g.pillarId && pillarXp[g.pillarId] !== undefined) {
      pillarXp[g.pillarId] += g.xp || 0;
    }
  });

  const totalXp = Math.max(0, Math.round(xp));
  const level = getLevelFromTotalXp(totalXp);
  PILLARS.forEach((p) => (pillarXp[p] = Math.max(0, Math.round(pillarXp[p]))));

  return {
    totalXp,
    pillarXp,
    level,
    currentRankId: getRankIdFromLevel(level),
    ryo: Math.max(0, Math.round(ryo + getLevelUpRyoTotal(level))),
  };
}

/** Instante imediatamente posterior a `iso` (garante ordem estrita mesmo com relógio atrasado). */
const justAfter = (iso: string): string => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms + 1).toISOString() : new Date().toISOString();
};

/** Adiciona um lançamento (sem efeito se a chave já existir). */
export function addGrant(state: LedgerState, grant: RewardGrant): LedgerState {
  if (state.grants[grant.key]) return state;
  const tomb = state.revoked?.[grant.key];
  // Um novo lançamento precisa ser mais recente que um estorno anterior da mesma chave
  const createdAt = tomb && tomb >= grant.createdAt ? justAfter(tomb) : grant.createdAt;
  return { ...state, grants: { ...state.grants, [grant.key]: { ...grant, createdAt } } };
}

/** Estorna um lançamento e registra o estorno para os outros aparelhos. */
export function removeGrant(state: LedgerState, key: string, at: string = new Date().toISOString()): LedgerState {
  const existing = state.grants[key];
  const grants = { ...state.grants };
  delete grants[key];
  const when = existing && (existing.createdAt || '') >= at ? justAfter(existing.createdAt) : at;
  return { grants, revoked: { ...(state.revoked || {}), [key]: when } };
}

/** Lançamentos de rotina, que podem ser resumidos por dia quando ficam antigos. */
export function isFoldableKey(key: string): boolean {
  return (
    key.startsWith('mission:') ||
    key.startsWith('tool:') ||
    key.startsWith('habit:') ||
    key.startsWith('checkin:') ||
    key.startsWith('retro:')
  );
}

/**
 * Junta os livros-razão de dois aparelhos.
 *  - mesma chave nos dois lados → fica a versão mais recente;
 *  - um estorno mais recente que o lançamento o remove;
 *  - se um lado já resumiu um dia, os lançamentos avulsos daquele dia somem.
 * A operação é comutativa e idempotente (pode repetir à vontade).
 */
export function mergeLedgers(a: LedgerState, b: LedgerState): LedgerState {
  const revoked: Tombstones = { ...(a.revoked || {}) };
  Object.entries(b.revoked || {}).forEach(([key, at]) => {
    if (!revoked[key] || at > revoked[key]) revoked[key] = at;
  });

  const grants: Ledger = {};
  const keys = new Set([...Object.keys(a.grants || {}), ...Object.keys(b.grants || {})]);
  keys.forEach((key) => {
    const ga = a.grants?.[key];
    const gb = b.grants?.[key];
    const pick = !ga ? gb : !gb ? ga : (gb.createdAt || '') > (ga.createdAt || '') ? gb : ga;
    if (!pick) return;
    if (revoked[key] && revoked[key] >= (pick.createdAt || '')) return;
    grants[key] = pick;
  });

  const summarizedDays = new Set(
    Object.keys(grants)
      .filter((k) => k.startsWith(DAY_SUMMARY_PREFIX))
      .map((k) => k.slice(DAY_SUMMARY_PREFIX.length))
  );
  if (summarizedDays.size > 0) {
    Object.keys(grants).forEach((key) => {
      if (isFoldableKey(key) && summarizedDays.has(grants[key].date)) delete grants[key];
    });
  }

  return { grants, revoked };
}

/** Resume os lançamentos de rotina anteriores a `cutoffDate` em um lançamento por dia. */
export function compactLedger(grants: Ledger, cutoffDate: string): Ledger {
  const old = Object.values(grants).filter((g) => isFoldableKey(g.key) && g.date < cutoffDate);
  if (old.length === 0) return grants;

  const next: Ledger = { ...grants };
  old.forEach((g) => {
    delete next[g.key];
    const key = `${DAY_SUMMARY_PREFIX}${g.date}`;
    const summary: RewardGrant = next[key]
      ? { ...next[key], pillarXp: { ...(next[key].pillarXp || {}) } }
      : { key, date: g.date, label: 'Resumo do dia', xp: 0, ryo: 0, pillarXp: {}, createdAt: g.createdAt };
    summary.xp += g.xp || 0;
    summary.ryo += g.ryo || 0;
    if (g.pillarId) summary.pillarXp![g.pillarId] = (summary.pillarXp![g.pillarId] || 0) + (g.xp || 0);
    if ((g.createdAt || '') > (summary.createdAt || '')) summary.createdAt = g.createdAt;
    next[key] = summary;
  });
  return next;
}

/** Esquece estornos antigos (todos os aparelhos já tiveram tempo de sincronizar). */
export function pruneTombstones(revoked: Tombstones, today: string): Tombstones {
  const cutoff = addDaysToDateString(today, -TOMBSTONE_TTL_DAYS);
  const entries = Object.entries(revoked || {});
  const kept = entries.filter(([, at]) => (at || '').slice(0, 10) >= cutoff);
  return kept.length === entries.length ? revoked : Object.fromEntries(kept);
}

/**
 * Migração: transforma os totais salvos pelo sistema antigo em um lançamento
 * de saldo inicial, de forma que `deriveTotals` devolva exatamente os mesmos números.
 */
export function buildLegacyBase(
  totals: { totalXp: number; ryo: number; pillarXp?: Partial<Record<PillarId, number>> },
  grants: Ledger,
  createdAt: string
): RewardGrant {
  const others = Object.fromEntries(Object.entries(grants || {}).filter(([k]) => k !== LEGACY_BASE_KEY));
  const fromLedger = Object.values(others).reduce(
    (acc, g) => {
      acc.xp += g.xp || 0;
      acc.ryo += g.ryo || 0;
      if (g.pillarXp) PILLARS.forEach((p) => (acc.pillars[p] += g.pillarXp?.[p] || 0));
      else if (g.pillarId) acc.pillars[g.pillarId] += g.xp || 0;
      return acc;
    },
    { xp: 0, ryo: 0, pillars: emptyPillarXp() }
  );

  const totalXp = Math.max(0, Math.round(totals.totalXp || 0));
  const level = getLevelFromTotalXp(totalXp);
  const pillarXp = emptyPillarXp();
  PILLARS.forEach((p) => (pillarXp[p] = Math.round((totals.pillarXp?.[p] || 0) - fromLedger.pillars[p])));

  return {
    key: LEGACY_BASE_KEY,
    date: '2020-01-01',
    label: 'Saldo anterior à revisão do sistema',
    xp: totalXp - Math.round(fromLedger.xp),
    ryo: Math.round(totals.ryo || 0) - Math.round(fromLedger.ryo) - getLevelUpRyoTotal(level),
    pillarXp,
    createdAt,
  };
}
