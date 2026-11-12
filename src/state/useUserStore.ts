import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  UserProfile,
  AvatarConfig,
  NotificationSettings,
  Item,
  ProtocolChallengeCycle,
  RewardGrant,
  Mission,
  DayRecord,
} from '../core/types';
import { PillarId, UserRankId } from '../theme/types';
import { calculateXpGainWithBuffs } from '../core/xpEngine';
import { getDailyCheckInRyoBonus, calculateRyoGainWithBuffs } from '../core/ryoEngine';
import {
  computeCurrentStreak,
  computeBestStreak,
  countCompletedDays,
  evaluateChallengeCycle,
  asActiveCandidate,
  getChallengeCompletionReward,
  getCycleTargetDays,
  buildDayLogFromLegacy,
  recomputeDay,
  reconcileProgression,
  ShieldContext,
  ABANDONED_REASON,
} from '../core/streakEngine';
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
import { getTodayString, addDaysToDateString, getWeekKey, isValidDateString, daysBetween } from '../core/dateUtils';
import { allGameItems, STARTER_ITEMS } from '../core/itemsData';
import { teachingCards } from '../core/cardsData';
import { soundFx } from '../utils/audio';
import { triggerLevelUpConfetti, triggerDayCompleteConfetti, triggerChallengeCompleteConfetti } from '../utils/confetti';
import { useHabitStore } from './useHabitStore';
import { useChallengeStore } from './useChallengeStore';
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

  if (p.activeChallenge) {
    const cycle = p.activeChallenge;
    if (cycle.status !== 'active') {
      p.challengeHistory = [cycle, ...p.challengeHistory.filter((c) => c.id !== cycle.id)];
      p.activeChallenge = undefined;
    } else {
      cycle.targetDays = getCycleTargetDays(cycle);
      cycle.isEliteMode = cycle.isEliteMode ?? p.isHardModeEnabled;
      if (!isValidDateString(cycle.startDate)) cycle.startDate = today;
      // Cortesia de migração: faltas anteriores à atualização não encerram o desafio.
      if (options.isLegacy && !cycle.graceBefore) cycle.graceBefore = today;
    }
  }

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
   * nenhum dia é fechado e nenhum desafio é encerrado (ver `reconcile`).
   */
  cloudGate: 'open' | 'pending';
  activeLevelUpModal: { oldLevel: number; newLevel: number; oldRank: UserRankId; newRank: UserRankId } | null;
  activeResetModal: { cycle: ProtocolChallengeCycle } | null;
  activeCompletionModal: { cycle: ProtocolChallengeCycle } | null;
  isChallengeHistoryModalOpen: boolean;
  isChallengeMapModalOpen: boolean;
  isStartChallengeModalOpen: boolean;
  toasts: Toast[];

  // Perfil
  updateProfile: (updates: Partial<UserProfile>) => void;
  /** Marca que o shinobi alterou algo neste aparelho (usado para decidir preferências na sincronização). */
  touch: () => void;
  /** Zera toda a progressão, preservando a identidade e as preferências do cadastro. */
  resetProgress: () => void;
  setProfileName: (name: string) => void;
  updateAvatar: (config: Partial<AvatarConfig>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  toggleHardMode: () => { success: boolean; reason?: string };
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

  // Dias, sequência e desafio
  /**
   * Ponto ÚNICO de reconciliação: recalcula dias, escudos, sequência e desafio
   * a partir dos dados atuais. Idempotente — pode ser chamado a qualquer momento.
   */
  reconcile: (options?: { silent?: boolean }) => void;
  refreshToday: (options?: { silent?: boolean }) => void;
  checkDayTransition: () => void;
  recalculateStreak: () => { currentStreak: number; bestStreak: number };
  /** Recalcula um dia passado depois de uma correção manual das missões. */
  correctPastDay: (date: string) => void;
  setCloudGate: (gate: 'open' | 'pending') => void;
  /** Recebe o perfil já mesclado pela sincronização. */
  applySyncedProfile: (profile: UserProfile) => void;
  startChallenge: (params?: { title?: string; targetDays?: number; startDate?: string; missions?: Mission[]; isEliteMode?: boolean }) => ProtocolChallengeCycle;
  startNewChallengeCycle: () => void;
  abandonChallenge: () => void;
  deleteActiveChallenge: () => void;
  updateActiveChallenge: (updates: { title?: string; targetDays?: number; isEliteMode?: boolean }) => void;
  deleteHistoryCycle: (cycleId: string) => void;
  clearChallengeHistory: () => void;
  restoreArchivedCycle: (cycleId: string) => boolean;
  dismissResetModal: () => void;
  dismissCompletionModal: () => void;
  openChallengeHistoryModal: () => void;
  closeChallengeHistoryModal: () => void;
  openChallengeMapModal: () => void;
  closeChallengeMapModal: () => void;
  openStartChallengeModal: () => void;
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

      /** Paga o bônus de conclusão (uma única vez) e abre o modal de vitória. */
      const celebrateCompletion = (cycle: ProtocolChallengeCycle) => {
        const target = getCycleTargetDays(cycle);
        const reward = getChallengeCompletionReward(target);
        const key = `challenge:${cycle.id}`;
        get().grantReward({
          key,
          label: `Desafio concluído: ${cycle.title || `${target} dias`}`,
          baseXp: reward.xp,
          baseRyo: reward.ryo,
          pillarId: 'chakra',
          applyXpBuffs: false,
          applyRyoBuffs: false,
        });
        const paid = get().profile.grants[key];
        const finished: ProtocolChallengeCycle = { ...cycle, rewardXp: paid?.xp ?? reward.xp, rewardRyo: paid?.ryo ?? reward.ryo };
        set((state) => ({
          profile: {
            ...state.profile,
            challengeHistory: (state.profile.challengeHistory || []).map((c) => (c.id === cycle.id ? finished : c)),
          },
          activeCompletionModal: { cycle: finished },
        }));
        soundFx.playChallengeComplete();
        triggerChallengeCompleteConfetti();
      };

      const reconcile = (options?: { silent?: boolean }) => {
        const today = getTodayString();
        const missions = useHabitStore.getState().missions;
        const before = get().profile;
        const settlePast = get().cloudGate !== 'pending';

        const result = reconcileProgression(
          {
            dayLog: before.dayLog,
            shieldedDates: before.shieldedDates,
            shieldsThrough: before.shieldsThrough,
            activeChallenge: before.activeChallenge,
            challengeHistory: before.challengeHistory || [],
            bestStreak: before.bestStreak,
          },
          { today, missions, shield: shieldContext(before), settlePast }
        );

        const unlockedCards = getReconciledUnlockedCards(result.completedDays);
        const patch: Partial<UserProfile> = {
          dayLog: result.dayLog,
          shieldedDates: result.shieldedDates,
          shieldsThrough: result.shieldsThrough,
          activeChallenge: result.activeChallenge,
          challengeHistory: result.challengeHistory,
          currentProtocolDay: result.activeChallenge?.currentDay || 0,
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

        // ── Reações aos eventos (som, avisos, modais) ──
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
          } else if (event.type === 'cycle_failed') {
            set({ activeResetModal: { cycle: event.cycle } });
            soundFx.playChallengeFailed();
          } else if (event.type === 'cycle_completed') {
            celebrateCompletion(event.cycle);
          } else if (event.type === 'cycle_restored') {
            set({ activeResetModal: null });
            get().pushToast({
              kind: 'success',
              title: 'Desafio restaurado!',
              message: 'Os registros atualizados mostram que o ciclo não deveria ter sido encerrado. Ele voltou de onde parou.',
            });
          }
        });

        // O aviso de "desafio interrompido" não pode sobreviver a um ciclo que voltou a valer
        // (ex.: a sincronização trouxe o mesmo ciclo ainda ativo de outro aparelho)
        const openReset = get().activeResetModal;
        if (openReset && get().profile.activeChallenge?.id === openReset.cycle.id) {
          set({ activeResetModal: null });
        }

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
        isChallengeHistoryModalOpen: false,
        isChallengeMapModalOpen: false,
        isStartChallengeModalOpen: false,
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
            isChallengeHistoryModalOpen: false,
            isChallengeMapModalOpen: false,
            isStartChallengeModalOpen: false,
            toasts: [],
          });
        },

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

        toggleHardMode: () => {
          const { profile } = get();
          if (profile.activeChallenge && profile.activeChallenge.status === 'active') {
            return {
              success: false,
              reason: 'O Modo Elite é definido no início do desafio e fica travado até ele terminar.',
            };
          }
          set((state) => ({
            profile: touch({ ...state.profile, isHardModeEnabled: !state.profile.isHardModeEnabled }),
          }));
          reconcile({ silent: true });
          return { success: true };
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
            isStartChallengeModalOpen: true,
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
          useChallengeStore.getState().autoCompleteExpiredChallenges();
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
          const record: DayRecord = recomputeDay(get().profile.dayLog[date], missions, date, stamp());
          set((state) => ({ profile: touch({ ...state.profile, dayLog: { ...state.profile.dayLog, [date]: record } }) }));
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

        startChallenge: (params) => {
          const { profile } = get();
          const today = getTodayString();
          if (profile.activeChallenge && profile.activeChallenge.status === 'active') {
            get().abandonChallenge();
          }
          const history = get().profile.challengeHistory || [];
          const targetDays = Math.min(365, Math.max(7, Math.round(params?.targetDays || 66)));
          let startDate = params?.startDate && isValidDateString(params.startDate) ? params.startDate : today;
          if (daysBetween(today, startDate) > 30) startDate = addDaysToDateString(today, 30);
          const cycleNumber = history.length + 1;
          const isEliteMode = Boolean(params?.isEliteMode);

          const cycle: ProtocolChallengeCycle = {
            id: `cycle_${cycleNumber}_${Date.now()}`,
            cycleNumber,
            title: params?.title?.trim() || `Desafio ${targetDays} Dias — Ciclo #${cycleNumber}`,
            targetDays,
            isEliteMode,
            startDate,
            createdOn: today,
            graceBefore: startDate < today ? today : undefined,
            status: 'active',
            currentDay: startDate === today ? 1 : 0,
            daysCompleted: 0,
            checkIns: {},
            totalXpEarned: 0,
            createdAt: stamp(),
          };

          if (params?.missions && params.missions.length > 0) {
            useHabitStore.getState().setCustomMissionList(params.missions);
          }

          set((state) => ({
            profile: touch({
              ...state.profile,
              activeChallenge: cycle,
              currentProtocolDay: cycle.currentDay,
              isHardModeEnabled: isEliteMode,
            }),
            activeResetModal: null,
            activeCompletionModal: null,
            isStartChallengeModalOpen: false,
          }));

          soundFx.playChallengeStart();
          triggerLevelUpConfetti();
          reconcile({ silent: true });
          return get().profile.activeChallenge || cycle;
        },

        abandonChallenge: () => {
          const { profile } = get();
          const cycle = profile.activeChallenge;
          if (!cycle || cycle.status !== 'active') return;
          const archived: ProtocolChallengeCycle = {
            ...cycle,
            status: 'failed',
            endedBy: 'user',
            endDate: getTodayString(),
            failedReason: ABANDONED_REASON,
          };
          set((state) => ({
            profile: touch({
              ...state.profile,
              activeChallenge: undefined,
              currentProtocolDay: 0,
              challengeHistory: [archived, ...(state.profile.challengeHistory || [])],
            }),
          }));
        },

        deleteActiveChallenge: () => {
          const cycle = get().profile.activeChallenge;
          if (cycle) {
            const from = cycle.startDate;
            const at = stamp();

            // 1. Estorna tudo o que foi ganho desde o início do ciclo (compras não são reembolsadas)
            Object.values(get().profile.grants || {})
              .filter((grant) => grant.date >= from && grant.key !== LEGACY_BASE_KEY && !grant.key.startsWith('shop:'))
              .forEach((grant) => get().revokeReward(grant.key));

            // 2. O desafio oficial usa as missões diárias: remove as marcações do período
            //    e deixa lápides para que outros aparelhos também as removam.
            const today = getTodayString();
            const erased: string[] = [];
            useHabitStore.setState((state) => ({
              missions: state.missions.map((mission) => {
                (mission.completedDates || []).forEach((date) => date >= from && erased.push(`mission:${mission.id}:${date}`));
                const completedDates = (mission.completedDates || []).filter((date) => date < from);
                return { ...mission, completedDates, isCompletedToday: completedDates.includes(today) };
              }),
            }));
            get().forgetRewards(erased);

            // 3. Apaga os dias consolidados do período
            set((state) => ({
              profile: touch({
                ...state.profile,
                activeChallenge: undefined,
                currentProtocolDay: 0,
                dayLog: Object.fromEntries(Object.entries(state.profile.dayLog).filter(([date]) => date < from)),
                shieldedDates: state.profile.shieldedDates.filter((date) => date < from),
                dayWipe: { from, at },
                deletedCycles: { ...state.profile.deletedCycles, [cycle.id]: at },
              }),
            }));
          }
          set({ activeResetModal: null, activeCompletionModal: null });
          reconcile({ silent: true });
        },

        updateActiveChallenge: (updates) => {
          const { profile } = get();
          if (!profile.activeChallenge) return;
          const current = profile.activeChallenge;
          const nextDays = updates.targetDays !== undefined ? Math.max(7, Math.min(365, Math.round(updates.targetDays))) : (current.targetDays || 66);
          const updatedCycle: ProtocolChallengeCycle = {
            ...current,
            title: updates.title !== undefined ? updates.title.trim() : current.title,
            targetDays: nextDays,
            isEliteMode: updates.isEliteMode !== undefined ? updates.isEliteMode : current.isEliteMode,
          };
          set((state) => ({
            profile: touch({
              ...state.profile,
              activeChallenge: updatedCycle,
              isHardModeEnabled: updatedCycle.isEliteMode ?? state.profile.isHardModeEnabled,
            }),
          }));
          reconcile({ silent: true });
        },

        deleteHistoryCycle: (cycleId) => {
          get().revokeReward(`challenge:${cycleId}`);
          const at = stamp();
          set((state) => ({
            profile: touch({
              ...state.profile,
              challengeHistory: (state.profile.challengeHistory || []).filter((c) => c.id !== cycleId),
              deletedCycles: { ...state.profile.deletedCycles, [cycleId]: at },
            }),
          }));
        },

        clearChallengeHistory: () => {
          const history = get().profile.challengeHistory || [];
          history.forEach((cycle) => get().revokeReward(`challenge:${cycle.id}`));
          const at = stamp();
          set((state) => ({
            profile: touch({
              ...state.profile,
              challengeHistory: [],
              deletedCycles: { ...state.profile.deletedCycles, ...Object.fromEntries(history.map((c) => [c.id, at])) },
            }),
          }));
        },

        startNewChallengeCycle: () => {
          get().abandonChallenge();
          set({ isStartChallengeModalOpen: true, activeResetModal: null });
        },

        restoreArchivedCycle: (cycleId) => {
          const { profile } = get();
          if (profile.activeChallenge && profile.activeChallenge.status === 'active') return false;
          const history = profile.challengeHistory || [];
          const target = history.find((c) => c.id === cycleId);
          if (!target || target.status !== 'failed') return false;

          const result = evaluateChallengeCycle(asActiveCandidate(target), profile.dayLog, getTodayString());
          if (result.outcome === 'failed') return false;

          set((state) => ({
            profile: touch({
              ...state.profile,
              activeChallenge: { ...result.cycle, status: 'active' },
              challengeHistory: history.filter((c) => c.id !== cycleId),
              isHardModeEnabled: Boolean(result.cycle.isEliteMode),
            }),
            activeResetModal: null,
          }));
          reconcile({ silent: true });
          return true;
        },

        dismissResetModal: () => set({ activeResetModal: null }),
        dismissCompletionModal: () => set({ activeCompletionModal: null }),
        openChallengeHistoryModal: () => set({ isChallengeHistoryModalOpen: true }),
        closeChallengeHistoryModal: () => set({ isChallengeHistoryModalOpen: false }),
        openChallengeMapModal: () => set({ isChallengeMapModalOpen: true }),
        closeChallengeMapModal: () => set({ isChallengeMapModalOpen: false }),
        openStartChallengeModal: () => set({ isStartChallengeModalOpen: true }),
        closeStartChallengeModal: () => set({ isStartChallengeModalOpen: false }),

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
