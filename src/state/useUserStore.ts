import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  UserProfile,
  AvatarConfig,
  NotificationSettings,
  Item,
  RewardGrant,
  Mission,
  DayRecord,
  Measure,
} from '../core/types';
import { PillarId, UserRankId } from '../theme/types';
import { calculateXpGainWithBuffs } from '../core/xpEngine';
import { getDailyCheckInRyoBonus, calculateRyoGainWithBuffs } from '../core/ryoEngine';
import {
  computeCurrentStreak,
  computeBestStreak,
  countCompletedDays,
  buildDayLogFromLegacy,
  recomputeDay,
  reconcileProgression,
  ShieldContext,
} from '../core/streakEngine';
import {
  challengeRewardKey,
  challengeStats,
  getChallengeCompletionReward,
  habitActiveOn,
  legacyStatusOf,
  makeChallengeContext,
} from '../core/challenges';
import {
  LedgerState,
  LEGACY_BASE_KEY,
  LEDGER_COMPACT_AFTER_DAYS,
  addGrant,
  removeGrant,
  deriveTotals,
  buildLegacyBase,
  compactLedger,
  pruneTombstones,
  emptyPillarXp,
} from '../core/ledger';
import { stableStringify } from '../core/syncMerge';
import { getTodayString, addDaysToDateString, getWeekKey, isValidDateString } from '../core/dateUtils';
import { allGameItems, STARTER_ITEMS } from '../core/itemsData';
import { teachingCards } from '../core/cardsData';
import { soundFx } from '../utils/audio';
import { triggerLevelUpConfetti, triggerDayCompleteConfetti, triggerChallengeCompleteConfetti } from '../utils/confetti';
import { useHabitStore } from './useHabitStore';
import { useChallengeStore, setChallengesSilently } from './useChallengeStore';
import { useUIStore } from './useUIStore';
import { useDuelStore } from './useDuelStore';

// ─────────────────────────────────────────────────────────────
// Constantes de loja e helpers
// ─────────────────────────────────────────────────────────────

export const SOLDIER_PILL_PRICE = 600;
export const SHIELD_SCROLL_PRICE = 900;

/**
 * Lançamentos anteriores a esta data já estavam embutidos nos totais do
 * sistema antigo — na migração eles são absorvidos pelo saldo inicial.
 */
const LEGACY_LEDGER_EPOCH = '2026-11-08';

/** Pergaminhos liberados pelo total de Dias Cumpridos (nunca se perdem). */
export function getReconciledUnlockedCards(completedDays: number): string[] {
  const reached = Math.max(1, completedDays);
  return teachingCards.filter((card) => card.unlockedDay <= reached).map((card) => card.id);
}

export type ToastKind = 'success' | 'info' | 'warning' | 'shield' | 'card' | 'reward';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

export const createDefaultProfile = (): UserProfile => ({
  id: 'local_shinobi',
  name: 'Aspirante Shinobi',
  gender: 'male',
  ryo: 0,
  avatarConfig: {
    silhouette: 'shadow',
    outfit: 'tunic_dark',
    headband: 'iron_slate',
    auraColor: 'chakra',
    customEmoji: '🥷',
  },
  level: 1,
  totalXp: 0,
  currentRankId: 'aspirante',
  pillarXp: emptyPillarXp(),
  currentProtocolDay: 0,
  currentStreak: 0,
  bestStreak: 0,
  weeklyShieldsRemaining: 1,
  weeklyShieldsMax: 1,
  lastActiveDate: getTodayString(),
  isHardModeEnabled: false,
  notificationSettings: {
    morningTime: '07:30',
    eveningTime: '21:00',
    enabled: false,
    soundEnabled: true,
  },
  subscriptionStatus: 'trial',
  hasCompletedOnboarding: false,
  unlockedCards: ['card_tai_01'],
  equippedItems: ['pesos_ferro_negro'],
  inventory: [...STARTER_ITEMS],
  activeChallenge: undefined,
  challengeHistory: [],
  createdAt: new Date().toISOString(),
  dayLog: {},
  shieldedDates: [],
  grants: {},
  revoked: {},
  deletedMissions: {},
  deletedCycles: {},
  purchasedItems: [],
  extraShieldWeeks: [],
  soldierPillDates: [],
  bossesDefeated: 0,
  missionsCompletedTotal: 0,
  habitLinks: {},
});

function readPersistedMissions(): Mission[] {
  try {
    const raw = localStorage.getItem('shinobi_habit_store_v1');
    return raw ? (JSON.parse(raw)?.state?.missions as Mission[]) || [] : [];
  } catch {
    return [];
  }
}

const asRecord = <T,>(value: unknown): Record<string, T> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, T>) : {};

/**
 * Normaliza um perfil salvo (deste aparelho ou da nuvem) para o formato atual,
 * sem perder progresso. Pode rodar quantas vezes for.
 */
export function migrateProfile(
  raw: Partial<UserProfile> | undefined,
  missions: Mission[],
  options: { isLegacy?: boolean } = {}
): UserProfile {
  const base = createDefaultProfile();
  const today = getTodayString();
  // Perfis anteriores ao livro-razão guardavam XP/Ryō como totais soltos
  const isLegacyLedger = Boolean(raw) && raw!.revoked === undefined;
  const p: UserProfile = { ...base, ...(raw || {}) } as UserProfile;

  p.notificationSettings = { ...base.notificationSettings, ...(p.notificationSettings || {}) };
  p.avatarConfig = { ...base.avatarConfig, ...(p.avatarConfig || {}) };
  p.grants = asRecord<RewardGrant>(p.grants);
  p.revoked = asRecord<string>(p.revoked);
  p.deletedMissions = asRecord<string>(p.deletedMissions);
  p.deletedCycles = asRecord<string>(p.deletedCycles);
  p.habitLinks = asRecord(p.habitLinks);
  p.shieldedDates = Array.isArray(p.shieldedDates) ? p.shieldedDates.filter(isValidDateString) : [];
  p.purchasedItems = Array.isArray(p.purchasedItems) ? p.purchasedItems : [];
  p.extraShieldWeeks = Array.isArray(p.extraShieldWeeks) ? p.extraShieldWeeks : [];
  p.soldierPillDates = Array.isArray(p.soldierPillDates) ? p.soldierPillDates : [];
  p.challengeHistory = Array.isArray(p.challengeHistory) ? p.challengeHistory : [];
  p.equippedItems = Array.isArray(p.equippedItems) ? p.equippedItems : [];
  p.inventory = Array.isArray(p.inventory) && p.inventory.length ? p.inventory : [...STARTER_ITEMS];
  if (!isValidDateString(p.lastActiveDate)) p.lastActiveDate = today;

  if (isLegacyLedger) {
    const recent = Object.fromEntries(
      Object.entries(p.grants).filter(([key, g]) => g && key !== LEGACY_BASE_KEY && (g.date || '') >= LEGACY_LEDGER_EPOCH)
    );
    const baseGrant = buildLegacyBase(
      { totalXp: p.totalXp || 0, ryo: p.ryo || 0, pillarXp: { ...emptyPillarXp(), ...(p.pillarXp || {}) } },
      recent,
      p.updatedAt || new Date().toISOString()
    );
    p.grants = { ...recent, [LEGACY_BASE_KEY]: baseGrant };
    // Os dias anteriores à migração já tiveram seus escudos avaliados
    if (!isValidDateString(p.shieldsThrough)) p.shieldsThrough = addDaysToDateString(p.lastActiveDate, -1);
  }
  // XP, pilares, nível, patente e Ryō sempre saem do livro-razão
  Object.assign(p, deriveTotals(p.grants));

  if (!p.dayLog || typeof p.dayLog !== 'object' || Object.keys(p.dayLog).length === 0) {
    p.dayLog = buildDayLogFromLegacy(p, missions, today);
  }
  if (typeof p.missionsCompletedTotal !== 'number') {
    p.missionsCompletedTotal = missions.reduce((acc, m) => acc + (m.completedDates || []).length, 0);
  }
  if (typeof p.bossesDefeated !== 'number') p.bossesDefeated = 0;

  // Ciclos do formato antigo (activeChallenge/challengeHistory) ficam como estão até
  // a conversão para o modelo único (`migrateLegacyChallenges`), que os retira do perfil.

  p.bestStreak = Math.max(p.bestStreak || 0, computeBestStreak(p.dayLog, p.shieldedDates));
  p.currentStreak = computeCurrentStreak(p.dayLog, p.shieldedDates, today);
  p.unlockedCards = getReconciledUnlockedCards(countCompletedDays(p.dayLog));
  return p;
}

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

interface GrantParams {
  key: string;
  label: string;
  baseXp: number;
  baseRyo: number;
  pillarId?: PillarId;
  applyXpBuffs?: boolean;
  applyRyoBuffs?: boolean;
  dealDamage?: boolean;
  date?: string;
}

interface UserStoreState {
  profile: UserProfile;
  /**
   * 'pending' enquanto os dados da nuvem ainda não chegaram. Nesse intervalo
   * nenhum dia é fechado, nenhum bônus de desafio é pago e nenhum aviso de
   * desafio encerrado aparece (ver `reconcile`).
   */
  cloudGate: 'open' | 'pending';
  activeLevelUpModal: { oldLevel: number; newLevel: number; oldRank: UserRankId; newRank: UserRankId } | null;
  /** Desafio no Modo Elite encerrado por uma falta (aviso). */
  activeResetModal: { challengeId: string } | null;
  /** Desafio que chegou ao fim (comemoração). */
  activeCompletionModal: { challengeId: string } | null;
  isStartChallengeModalOpen: boolean;
  /** Ao abrir "novo desafio": de onde levar os hábitos (id de um desafio ou 'loose' para os avulsos). */
  startChallengeSource: string | null;
  toasts: Toast[];

  // Perfil
  updateProfile: (updates: Partial<UserProfile>) => void;
  /** Marca que o shinobi alterou algo neste aparelho (usado para decidir preferências na sincronização). */
  touch: () => void;
  /** Zera toda a progressão, preservando a identidade e as preferências do cadastro. */
  resetProgress: () => void;
  setProfileName: (name: string) => void;

  // Antes e depois (medidas pessoais)
  addMeasure: (data: { label: string; unit: string; goal: Measure['goal']; value?: number }) => string;
  /** Registra (ou corrige) o valor de uma medida em um dia — hoje, se a data não for informada. */
  logMeasure: (measureId: string, value: number, date?: string) => void;
  removeMeasureEntry: (measureId: string, date: string) => void;
  updateMeasure: (measureId: string, updates: Partial<Pick<Measure, 'label' | 'unit' | 'goal'>>) => void;
  deleteMeasure: (measureId: string) => void;
  updateAvatar: (config: Partial<AvatarConfig>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  completeOnboarding: (name: string, gender?: 'male' | 'female', email?: string, whatsapp?: string) => void;

  // Recompensas (livro-razão)
  isEliteActive: () => boolean;
  isSoldierPillActive: () => boolean;
  grantReward: (params: GrantParams) => RewardGrant | null;
  revokeReward: (key: string) => RewardGrant | null;
  /** Registra que uma chave foi desfeita mesmo sem lançamento local (para os outros aparelhos). */
  forgetRewards: (keys: string[]) => void;
  hasGrant: (key: string) => boolean;
  closeLevelUpModal: () => void;

  // Equipamentos e inventário
  getEquippedItems: () => Item[];
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  syncInventory: () => void;

  // Loja
  buyItem: (itemId: string) => { success: boolean; reason?: string };
  buySoldierPill: () => { success: boolean; reason?: string };
  buyShieldScroll: () => { success: boolean; reason?: string };

  // Dias, sequência e desafios
  /**
   * Ponto ÚNICO de reconciliação: recalcula dias, escudos, sequência e o estado
   * dos desafios a partir dos dados atuais. Idempotente — pode ser chamado a qualquer momento.
   */
  reconcile: (options?: { silent?: boolean }) => void;
  refreshToday: (options?: { silent?: boolean }) => void;
  checkDayTransition: () => void;
  recalculateStreak: () => { currentStreak: number; bestStreak: number };
  /** Recalcula um dia passado depois de uma correção manual das missões. */
  correctPastDay: (date: string) => void;
  /** Recalcula exatamente dias passados (meta inclusa) depois de excluir hábitos ou um desafio. */
  recomputePastDays: (dates: string[]) => void;
  setCloudGate: (gate: 'open' | 'pending') => void;
  /** Recebe o perfil já mesclado pela sincronização. */
  applySyncedProfile: (profile: UserProfile) => void;
  dismissResetModal: () => void;
  dismissCompletionModal: () => void;
  openStartChallengeModal: (source?: string | null) => void;
  closeStartChallengeModal: () => void;

  // Notificações visuais
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => {
      const stamp = () => new Date().toISOString();
      const touch = (profile: UserProfile): UserProfile => ({ ...profile, updatedAt: stamp() });
      const ledgerOf = (profile: UserProfile): LedgerState => ({ grants: profile.grants || {}, revoked: profile.revoked || {} });

      const shieldContext = (profile: UserProfile): ShieldContext => ({
        isEliteMode: profile.isHardModeEnabled,
        equippedItems: profile.equippedItems.map((id) => allGameItems[id]).filter(Boolean),
        extraShieldWeeks: profile.extraShieldWeeks,
      });

      /**
       * Grava o livro-razão e recalcula TODOS os totais (XP, pilares, nível,
       * patente, Ryō). É o único lugar onde esses números mudam.
       */
      const commitLedger = (ledger: LedgerState) => {
        const before = get().profile;
        const totals = deriveTotals(ledger.grants);
        const leveledUp = totals.level > before.level;

        set((state) => ({
          profile: touch({ ...state.profile, grants: ledger.grants, revoked: ledger.revoked, ...totals }),
          activeLevelUpModal: leveledUp
            ? { oldLevel: before.level, newLevel: totals.level, oldRank: before.currentRankId, newRank: totals.currentRankId }
            : state.activeLevelUpModal,
        }));

        if (leveledUp) {
          if (totals.currentRankId !== before.currentRankId) soundFx.playRankUp();
          else soundFx.playLevelUp();
          triggerLevelUpConfetti();
        }
      };

      /** Lança uma despesa de Ryō (compra). A chave garante que nunca é cobrada duas vezes. */
      const spend = (key: string, label: string, price: number) => {
        commitLedger(
          addGrant(ledgerOf(get().profile), { key, date: getTodayString(), label, xp: 0, ryo: -Math.abs(price), createdAt: stamp() })
        );
      };

      /** Aplica só o que realmente mudou — evita regravar (e ressincronizar) à toa. */
      const patchProfile = (patch: Partial<UserProfile>) => {
        const current = get().profile as unknown as Record<string, unknown>;
        const changed: Record<string, unknown> = {};
        Object.entries(patch).forEach(([key, value]) => {
          if (current[key] === value) return;
          if (typeof value === 'object' && value !== null && typeof current[key] === 'object' && current[key] !== null) {
            if (stableStringify(current[key]) === stableStringify(value)) return;
          }
          changed[key] = value;
        });
        if (Object.keys(changed).length > 0) {
          set((state) => ({ profile: { ...state.profile, ...(changed as Partial<UserProfile>) } }));
        }
      };

      /**
       * Desafios: o estado de cada um é CALCULADO das marcações. Aqui só se
       * reflete esse estado (espelho `status`, Modo Elite em vigor, bônus de
       * conclusão) e se avisa uma única vez, por aparelho, quando um desafio
       * termina ou cai no Modo Elite.
       */
      const reconcileChallenges = (today: string, settlePast: boolean) => {
        const challenges = useChallengeStore.getState().challenges;
        const missions = useHabitStore.getState().missions;
        const ctx = makeChallengeContext(challenges, missions, get().profile.habitLinks);
        const stats = new Map(challenges.map((c) => [c.id, challengeStats(c, ctx, today)]));

        // Espelho do estado no campo antigo (telas e quadro de operação)
        const mirrored = challenges.map((c) => {
          const status = legacyStatusOf(stats.get(c.id)!.state);
          return c.status === status ? c : { ...c, status };
        });
        if (mirrored.some((c, i) => c !== challenges[i])) setChallengesSilently(mirrored);

        // Bônus de conclusão: só quando o desafio chega ao fim (estornável se deixar de valer)
        if (settlePast) {
          challenges.forEach((c) => {
            const key = challengeRewardKey(c.id);
            const has = Boolean(get().profile.grants?.[key]);
            const earned = stats.get(c.id)!.finishedNaturally;
            if (earned && !has) {
              const reward = getChallengeCompletionReward(c.targetDays);
              get().grantReward({
                key,
                label: `Desafio concluído: ${c.title}`,
                baseXp: reward.xp,
                baseRyo: reward.ryo,
                pillarId: 'chakra',
                applyXpBuffs: false,
                applyRyoBuffs: false,
                date: stats.get(c.id)!.endDate,
              });
            } else if (!earned && has) {
              get().revokeReward(key);
            }
          });
        }

        // Avisos (uma vez por aparelho). Na primeira vez, só registra o que já existe.
        if (!settlePast || !get().profile.hasCompletedOnboarding) return stats;
        const outcomes = challenges
          .map((c) => ({ id: c.id, state: stats.get(c.id)!.state, natural: stats.get(c.id)!.finishedNaturally }))
          .filter((o) => o.state === 'failed' || o.natural)
          .map((o) => ({ ...o, key: `${o.id}:${o.state}` }));
        const ui = useUIStore.getState();
        const seen = ui.seenChallengeOutcomes;
        if (seen === null) {
          ui.setSeenChallengeOutcomes(outcomes.map((o) => o.key));
          return stats;
        }
        const fresh = outcomes.filter((o) => !seen.includes(o.key));
        if (fresh.length === 0) return stats;
        ui.setSeenChallengeOutcomes([...seen, ...fresh.map((o) => o.key)]);
        const failed = fresh.find((o) => o.state === 'failed');
        const done = fresh.find((o) => o.natural);
        if (done && !get().activeCompletionModal) {
          set({ activeCompletionModal: { challengeId: done.id } });
          soundFx.playChallengeComplete();
          triggerChallengeCompleteConfetti();
        } else if (failed && !get().activeResetModal) {
          set({ activeResetModal: { challengeId: failed.id } });
          soundFx.playChallengeFailed();
        }
        return stats;
      };

      /** Quais missões valem em cada dia (hábitos de desafios encerrados ou retirados, não). */
      const missionFilter = () => {
        const ctx = makeChallengeContext(
          useChallengeStore.getState().challenges,
          useHabitStore.getState().missions,
          get().profile.habitLinks
        );
        return (mission: Mission, date: string) => habitActiveOn(mission, ctx.links, ctx.index, date);
      };

      const reconcile = (options?: { silent?: boolean }) => {
        const today = getTodayString();
        const missions = useHabitStore.getState().missions;
        const settlePast = get().cloudGate !== 'pending';

        // Desafios primeiro: o Modo Elite em vigor muda bônus de XP e escudos
        const stats = reconcileChallenges(today, settlePast);
        const challenges = useChallengeStore.getState().challenges;
        const running = challenges.filter((c) => stats.get(c.id)?.state === 'active');
        const eliteNow = running.some((c) => c.isEliteMode);
        const mainDay = running.find((c) => c.format !== 'board') || running[0];
        if (get().profile.isHardModeEnabled !== eliteNow) patchProfile({ isHardModeEnabled: eliteNow });

        const before = get().profile;
        const result = reconcileProgression(
          {
            dayLog: before.dayLog,
            shieldedDates: before.shieldedDates,
            shieldsThrough: before.shieldsThrough,
            bestStreak: before.bestStreak,
          },
          { today, missions, shield: shieldContext(before), settlePast, isActive: missionFilter() }
        );

        const unlockedCards = getReconciledUnlockedCards(result.completedDays);
        const patch: Partial<UserProfile> = {
          dayLog: result.dayLog,
          shieldedDates: result.shieldedDates,
          shieldsThrough: result.shieldsThrough,
          currentProtocolDay: mainDay ? stats.get(mainDay.id)!.dayNumber : 0,
          currentStreak: result.currentStreak,
          bestStreak: result.bestStreak,
          weeklyShieldsMax: result.weeklyShieldsMax,
          weeklyShieldsRemaining: result.weeklyShieldsRemaining,
          unlockedCards,
        };

        // Faxina, uma vez por dia: resume lançamentos antigos e esquece lápides vencidas
        if (settlePast && before.lastActiveDate !== today) {
          patch.lastActiveDate = today;
          patch.grants = compactLedger(before.grants, addDaysToDateString(today, -LEDGER_COMPACT_AFTER_DAYS));
          patch.revoked = pruneTombstones(before.revoked, today);
          patch.deletedMissions = pruneTombstones(before.deletedMissions, today);
          patch.deletedCycles = pruneTombstones(before.deletedCycles, today);
          patch.soldierPillDates = before.soldierPillDates.filter((d) => d >= addDaysToDateString(today, -30));
        }
        patchProfile(patch);

        // ── Reações aos eventos (som, avisos) ──
        result.events.forEach((event) => {
          if (event.type === 'shields_used') {
            soundFx.playShield();
            get().pushToast({
              kind: 'shield',
              title: 'Escudo de Chakra ativado!',
              message:
                event.dates.length === 1
                  ? 'Uma falta foi absorvida e sua sequência foi preservada.'
                  : `${event.dates.length} faltas foram absorvidas e sua sequência foi preservada.`,
            });
          }
        });

        // O aviso de "desafio encerrado" não sobrevive a um desafio que voltou a valer
        const openReset = get().activeResetModal;
        if (openReset && stats.get(openReset.challengeId)?.state !== 'failed') set({ activeResetModal: null });

        // ── Estipêndio do Dia Cumprido ──
        const record = get().profile.dayLog[today];
        const stipendKey = `checkin:${today}`;
        const hasStipend = get().hasGrant(stipendKey);
        if (record?.completed && !hasStipend) {
          const after = get().profile;
          const stipend = getDailyCheckInRyoBonus(after.currentStreak, after.level);
          get().grantReward({
            key: stipendKey,
            label: 'Sequência de perseverança — estipêndio da vila',
            baseXp: 0,
            baseRyo: stipend,
            applyRyoBuffs: false,
          });
          if (!options?.silent) {
            soundFx.playDayComplete();
            triggerDayCompleteConfetti();
            get().pushToast({
              kind: 'success',
              title: 'Sequência de Perseverança Garantida! 🔥',
              message: `Você atingiu 50% do XP diário e ganhou +1 dia na sequência. +${stipend} Ryō de estipêndio; sequência atual: ${after.currentStreak} ${after.currentStreak === 1 ? 'dia' : 'dias'}.`,
            });
          }
        } else if (record && !record.completed && hasStipend) {
          get().revokeReward(stipendKey);
        }

        // ── Novos pergaminhos ──
        const newCards = unlockedCards.filter((id) => !before.unlockedCards.includes(id));
        if (newCards.length > 0 && before.unlockedCards.length > 0 && !options?.silent) {
          const card = teachingCards.find((c) => c.id === newCards[newCards.length - 1]);
          if (card) {
            get().pushToast({
              kind: 'card',
              title: 'Novo Pergaminho de Ensinamento!',
              message: `"${card.title}" foi desbloqueado na aba Pergaminhos.`,
            });
          }
        }
      };

      return {
        profile: createDefaultProfile(),
        cloudGate: 'open',
        activeLevelUpModal: null,
        activeResetModal: null,
        activeCompletionModal: null,
        isStartChallengeModalOpen: false,
        startChallengeSource: null,
        toasts: [],

        updateProfile: (updates) => set((state) => ({ profile: touch({ ...state.profile, ...updates }) })),
        touch: () => set((state) => ({ profile: touch(state.profile) })),

        resetProgress: () => {
          const current = get().profile;
          const fresh = createDefaultProfile();
          set({
            profile: touch({
              ...fresh,
              id: current.id,
              name: current.name,
              email: current.email,
              whatsapp: current.whatsapp,
              gender: current.gender,
              avatarConfig: current.avatarConfig,
              notificationSettings: current.notificationSettings,
              subscriptionStatus: current.subscriptionStatus,
              hasCompletedOnboarding: true,
              createdAt: current.createdAt,
              // Marca o reset para que outros aparelhos também comecem do zero
              resetEpoch: stamp(),
            }),
            activeLevelUpModal: null,
            activeResetModal: null,
            activeCompletionModal: null,
            isStartChallengeModalOpen: false,
            startChallengeSource: null,
            toasts: [],
          });
        },

        addMeasure: ({ label, unit, goal, value }) => {
          const at = stamp();
          const id = `measure_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
          const measure: Measure = {
            id,
            label: label.trim(),
            unit: unit.trim(),
            goal,
            entries: typeof value === 'number' && Number.isFinite(value) ? { [getTodayString()]: { value, at } } : {},
            createdAt: at,
            updatedAt: at,
          };
          set((state) => ({
            profile: touch({ ...state.profile, measures: { ...(state.profile.measures || {}), [id]: measure } }),
          }));
          return id;
        },

        logMeasure: (measureId, value, date = getTodayString()) =>
          set((state) => {
            const measure = state.profile.measures?.[measureId];
            if (!measure || measure.deletedAt || !Number.isFinite(value) || !isValidDateString(date)) return state;
            const next: Measure = { ...measure, entries: { ...measure.entries, [date]: { value, at: stamp() } } };
            return { profile: touch({ ...state.profile, measures: { ...state.profile.measures, [measureId]: next } }) };
          }),

        // A remoção fica registrada (valor nulo) para que o outro aparelho também apague
        removeMeasureEntry: (measureId, date) =>
          set((state) => {
            const measure = state.profile.measures?.[measureId];
            if (!measure || !measure.entries[date]) return state;
            const next: Measure = { ...measure, entries: { ...measure.entries, [date]: { value: null, at: stamp() } } };
            return { profile: touch({ ...state.profile, measures: { ...state.profile.measures, [measureId]: next } }) };
          }),

        updateMeasure: (measureId, updates) =>
          set((state) => {
            const measure = state.profile.measures?.[measureId];
            if (!measure || measure.deletedAt) return state;
            const next: Measure = { ...measure, ...updates, updatedAt: stamp() };
            return { profile: touch({ ...state.profile, measures: { ...state.profile.measures, [measureId]: next } }) };
          }),

        deleteMeasure: (measureId) =>
          set((state) => {
            const measure = state.profile.measures?.[measureId];
            if (!measure) return state;
            const at = stamp();
            const next: Measure = { ...measure, entries: {}, updatedAt: at, deletedAt: at };
            return { profile: touch({ ...state.profile, measures: { ...state.profile.measures, [measureId]: next } }) };
          }),

        setProfileName: (name) =>
          set((state) => ({ profile: touch({ ...state.profile, name: name.trim() || 'Aspirante Shinobi' }) })),

        updateAvatar: (config) =>
          set((state) => ({
            profile: touch({ ...state.profile, avatarConfig: { ...state.profile.avatarConfig, ...config } }),
          })),

        updateNotifications: (settings) => {
          set((state) => ({
            profile: touch({
              ...state.profile,
              notificationSettings: { ...state.profile.notificationSettings, ...settings },
            }),
          }));
          if (settings.soundEnabled !== undefined) soundFx.setSoundEnabled(settings.soundEnabled);
        },

        completeOnboarding: (name, gender = 'male', email, whatsapp) => {
          set((state) => ({
            profile: touch({
              ...state.profile,
              name: name.trim() || 'Aspirante Shinobi',
              gender,
              email: email || state.profile.email,
              whatsapp: whatsapp || state.profile.whatsapp,
              avatarConfig: {
                ...state.profile.avatarConfig,
                customEmoji: gender === 'female' ? '🥷‍♀️' : '🥷',
              },
              hasCompletedOnboarding: true,
              lastActiveDate: getTodayString(),
            }),
            // As missões sugeridas no questionário viram os hábitos do primeiro desafio
            isStartChallengeModalOpen: true,
            startChallengeSource: 'loose',
          }));
        },

        // ── Recompensas ───────────────────────────────────────
        isEliteActive: () => get().profile.isHardModeEnabled,
        isSoldierPillActive: () => (get().profile.soldierPillDates || []).includes(getTodayString()),

        hasGrant: (key) => Boolean(get().profile.grants?.[key]),

        grantReward: (params) => {
          const { profile } = get();
          if (profile.grants?.[params.key]) return null;
          const equipped = get().getEquippedItems();
          const pillarId = params.pillarId;

          const finalXp =
            params.applyXpBuffs === false || !pillarId
              ? Math.max(0, Math.round(params.baseXp))
              : calculateXpGainWithBuffs(params.baseXp, pillarId, equipped, {
                  isEliteMode: get().isEliteActive(),
                  soldierPillActive: get().isSoldierPillActive(),
                }).finalXp;

          const finalRyo =
            params.applyRyoBuffs === false
              ? Math.max(0, Math.round(params.baseRyo))
              : calculateRyoGainWithBuffs(params.baseRyo, profile.currentStreak, profile.level, equipped, pillarId).finalRyo;

          const damage =
            params.dealDamage && finalXp > 0 && pillarId
              ? useDuelStore.getState().strike(finalXp, pillarId, equipped)
              : undefined;

          const grant: RewardGrant = {
            key: params.key,
            date: params.date || getTodayString(),
            label: params.label,
            xp: finalXp,
            ryo: finalRyo,
            pillarId,
            damage: damage && damage.length ? damage : undefined,
            createdAt: stamp(),
          };

          commitLedger(addGrant(ledgerOf(get().profile), grant));
          return get().profile.grants[grant.key] || grant;
        },

        revokeReward: (key) => {
          const grant = get().profile.grants?.[key];
          if (!grant) return null;
          commitLedger(removeGrant(ledgerOf(get().profile), key, stamp()));

          if (grant.damage?.length) {
            const revivedIds = useDuelStore.getState().revertStrike(grant.damage);
            revivedIds.forEach((bossId) => get().revokeReward(`boss:${bossId}`));
          }
          return grant;
        },

        forgetRewards: (keys) => {
          if (keys.length === 0) return;
          const at = stamp();
          let ledger = ledgerOf(get().profile);
          keys.forEach((key) => (ledger = removeGrant(ledger, key, at)));
          commitLedger(ledger);
        },

        closeLevelUpModal: () => set({ activeLevelUpModal: null }),

        // ── Equipamentos ──────────────────────────────────────
        getEquippedItems: () =>
          get()
            .profile.equippedItems.filter((id) => get().profile.inventory.includes(id))
            .map((id) => allGameItems[id])
            .filter(Boolean),

        equipItem: (itemId) => {
          const { profile } = get();
          const item = allGameItems[itemId];
          if (!item || !profile.inventory.includes(itemId) || profile.equippedItems.includes(itemId)) return;
          const others = profile.equippedItems.filter((id) => allGameItems[id] && allGameItems[id].type !== item.type);
          set((state) => ({ profile: touch({ ...state.profile, equippedItems: [...others, itemId] }) }));
          reconcile({ silent: true });
        },

        unequipItem: (itemId) => {
          set((state) => ({
            profile: touch({
              ...state.profile,
              equippedItems: state.profile.equippedItems.filter((id) => id !== itemId),
            }),
          }));
          reconcile({ silent: true });
        },

        syncInventory: () => {
          const { profile } = get();
          const inventory = useDuelStore.getState().getDerivedInventory(profile.purchasedItems);
          const equippedItems = profile.equippedItems.filter((id) => inventory.includes(id));
          const bossesDefeated = useDuelStore.getState().adversaries.filter((a) => a.isDefeated).length;
          patchProfile({ inventory, equippedItems, bossesDefeated });
        },

        // ── Loja ──────────────────────────────────────────────
        buyItem: (itemId) => {
          const { profile } = get();
          const item = allGameItems[itemId];
          if (!item || !item.shopPrice) return { success: false, reason: 'Item indisponível na loja.' };
          if (profile.inventory.includes(itemId)) return { success: false, reason: 'Você já possui este item.' };
          if (profile.ryo < item.shopPrice) {
            return { success: false, reason: `Faltam ${item.shopPrice - profile.ryo} Ryō para comprar.` };
          }
          spend(`shop:item:${itemId}`, `Compra: ${item.name}`, item.shopPrice);
          set((state) => ({
            profile: touch({ ...state.profile, purchasedItems: [...state.profile.purchasedItems, itemId] }),
          }));
          get().syncInventory();
          soundFx.playPurchase();
          return { success: true };
        },

        buySoldierPill: () => {
          const { profile } = get();
          const today = getTodayString();
          if (profile.soldierPillDates.includes(today)) return { success: false, reason: 'A Pílula de Soldado já está ativa hoje.' };
          if (profile.ryo < SOLDIER_PILL_PRICE) {
            return { success: false, reason: `Faltam ${SOLDIER_PILL_PRICE - profile.ryo} Ryō.` };
          }
          spend(`shop:pill:${today}`, 'Compra: Pílula de Soldado', SOLDIER_PILL_PRICE);
          set((state) => ({
            profile: touch({ ...state.profile, soldierPillDates: [...state.profile.soldierPillDates, today] }),
          }));
          soundFx.playPurchase();
          return { success: true };
        },

        buyShieldScroll: () => {
          const { profile } = get();
          const week = getWeekKey(getTodayString());
          if (profile.isHardModeEnabled) return { success: false, reason: 'No Modo Elite não há Escudos de Chakra.' };
          if (profile.extraShieldWeeks.includes(week)) return { success: false, reason: 'Você já reforçou o escudo nesta semana.' };
          if (profile.ryo < SHIELD_SCROLL_PRICE) {
            return { success: false, reason: `Faltam ${SHIELD_SCROLL_PRICE - profile.ryo} Ryō.` };
          }
          spend(`shop:shield:${week}`, 'Compra: Pergaminho de Proteção', SHIELD_SCROLL_PRICE);
          set((state) => ({
            profile: touch({ ...state.profile, extraShieldWeeks: [...state.profile.extraShieldWeeks.slice(-12), week] }),
          }));
          reconcile({ silent: true });
          soundFx.playShield();
          return { success: true };
        },

        // ── Dia, sequência e desafio ──────────────────────────
        reconcile,
        refreshToday: (options) => reconcile(options),

        checkDayTransition: () => {
          useHabitStore.getState().resetDailyMissionsIfNewDay();
          reconcile({ silent: true });
        },

        recalculateStreak: () => {
          reconcile({ silent: true });
          const { currentStreak, bestStreak } = get().profile;
          return { currentStreak, bestStreak };
        },

        correctPastDay: (date) => {
          const today = getTodayString();
          if (!isValidDateString(date) || date >= today) return;
          const missions = useHabitStore.getState().missions;
          const record: DayRecord = recomputeDay(get().profile.dayLog[date], missions, date, stamp(), missionFilter());
          set((state) => ({ profile: touch({ ...state.profile, dayLog: { ...state.profile.dayLog, [date]: record } }) }));
          reconcile({ silent: true });
        },

        recomputePastDays: (dates) => {
          const today = getTodayString();
          const valid = Array.from(new Set(dates.filter((d) => isValidDateString(d) && d < today)));
          if (valid.length === 0) return;
          const missions = useHabitStore.getState().missions;
          const isActive = missionFilter();
          const at = stamp();
          set((state) => {
            const dayLog = { ...state.profile.dayLog };
            valid.forEach((date) => {
              dayLog[date] = recomputeDay(dayLog[date], missions, date, at, isActive, { recomputeTarget: true });
            });
            return { profile: touch({ ...state.profile, dayLog }) };
          });
          reconcile({ silent: true });
        },

        setCloudGate: (gate) => {
          if (get().cloudGate === gate) return;
          set({ cloudGate: gate });
          if (gate === 'open') get().checkDayTransition();
        },

        applySyncedProfile: (profile) => {
          set({ profile });
          get().syncInventory();
          get().checkDayTransition();
        },

        dismissResetModal: () => set({ activeResetModal: null }),
        dismissCompletionModal: () => set({ activeCompletionModal: null }),
        openStartChallengeModal: (source = null) => set({ isStartChallengeModalOpen: true, startChallengeSource: source }),
        closeStartChallengeModal: () => set({ isStartChallengeModalOpen: false, startChallengeSource: null }),

        pushToast: (toast) => {
          const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }));
          setTimeout(() => get().dismissToast(id), 5200);
        },
        dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      };
    },
    {
      name: 'shinobi_user_store_v1',
      version: 3,
      partialize: (state) => ({ profile: state.profile }) as unknown as UserStoreState,
      migrate: (persisted, version) => {
        const state = (persisted || {}) as { profile?: Partial<UserProfile> };
        if (version < 2) {
          return {
            ...state,
            profile: migrateProfile(state.profile, readPersistedMissions(), { isLegacy: true }),
          } as unknown as UserStoreState;
        }
        return state as unknown as UserStoreState;
      },
      merge: (persisted, current) => {
        const state = (persisted || {}) as { profile?: Partial<UserProfile> };
        return {
          ...current,
          profile: migrateProfile(state.profile, readPersistedMissions()),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) soundFx.setSoundEnabled(state.profile.notificationSettings.soundEnabled !== false);
      },
    }
  )
);

/** Utilitário para telas: registro de um dia (ou vazio). */
export function getDayRecord(profile: UserProfile, date: string): DayRecord | undefined {
  return profile.dayLog?.[date];
}
