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
import { getLevelFromTotalXp, getRankIdFromLevel, calculateXpGainWithBuffs } from '../core/xpEngine';
import {
  getLevelUpRyoBetween,
  getDailyCheckInRyoBonus,
  calculateRyoGainWithBuffs,
} from '../core/ryoEngine';
import {
  buildDayRecord,
  closePastDays,
  applyShieldsToClosedDays,
  computeCurrentStreak,
  computeBestStreak,
  countCompletedDays,
  getWeeklyShieldCapacity,
  countShieldsUsedInWeek,
  evaluateChallengeCycle,
  getChallengeCompletionReward,
  getCycleTargetDays,
  buildDayLogFromLegacy,
  ShieldContext,
} from '../core/streakEngine';
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

const emptyPillars = (): Record<PillarId, number> => ({
  taijutsu: 0,
  ninjutsu: 0,
  chakra: 0,
  espirito: 0,
  genjutsu: 0,
});

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
  pillarXp: emptyPillars(),
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

/** Migra perfis antigos (v1) para o motor v2 sem perder progresso. */
export function migrateProfile(
  raw: Partial<UserProfile> | undefined,
  missions: Mission[],
  options: { isLegacy?: boolean } = {}
): UserProfile {
  const base = createDefaultProfile();
  const today = getTodayString();
  const p: UserProfile = { ...base, ...(raw || {}) } as UserProfile;

  p.pillarXp = { ...emptyPillars(), ...(p.pillarXp || {}) };
  p.notificationSettings = { ...base.notificationSettings, ...(p.notificationSettings || {}) };
  p.avatarConfig = { ...base.avatarConfig, ...(p.avatarConfig || {}) };
  p.totalXp = Math.max(0, Math.round(p.totalXp || 0));
  p.ryo = Math.max(0, Math.round(p.ryo || 0));
  p.level = getLevelFromTotalXp(p.totalXp);
  p.currentRankId = getRankIdFromLevel(p.level);
  p.grants = p.grants && typeof p.grants === 'object' ? p.grants : {};
  p.shieldedDates = Array.isArray(p.shieldedDates) ? p.shieldedDates.filter(isValidDateString) : [];
  p.purchasedItems = Array.isArray(p.purchasedItems) ? p.purchasedItems : [];
  p.extraShieldWeeks = Array.isArray(p.extraShieldWeeks) ? p.extraShieldWeeks : [];
  p.soldierPillDates = Array.isArray(p.soldierPillDates) ? p.soldierPillDates : [];
  p.challengeHistory = Array.isArray(p.challengeHistory) ? p.challengeHistory : [];
  p.equippedItems = Array.isArray(p.equippedItems) ? p.equippedItems : [];
  p.inventory = Array.isArray(p.inventory) && p.inventory.length ? p.inventory : [...STARTER_ITEMS];
  if (!isValidDateString(p.lastActiveDate)) p.lastActiveDate = today;

  if (!p.dayLog || typeof p.dayLog !== 'object' || Object.keys(p.dayLog).length === 0) {
    p.dayLog = buildDayLogFromLegacy(p, missions, today);
  }
  if (typeof p.missionsCompletedTotal !== 'number') {
    p.missionsCompletedTotal = missions.reduce((acc, m) => acc + (m.completedDates || []).length, 0);
  }
  if (typeof p.bossesDefeated !== 'number') p.bossesDefeated = 0;

  if (p.activeChallenge) {
    const cycle = p.activeChallenge as ProtocolChallengeCycle & { graceBefore?: string };
    if (cycle.status !== 'active') {
      p.challengeHistory = [cycle, ...p.challengeHistory];
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
  activeLevelUpModal: { oldLevel: number; newLevel: number; oldRank: UserRankId; newRank: UserRankId } | null;
  activeResetModal: { cycle: ProtocolChallengeCycle } | null;
  activeCompletionModal: { cycle: ProtocolChallengeCycle } | null;
  isChallengeHistoryModalOpen: boolean;
  isChallengeMapModalOpen: boolean;
  isStartChallengeModalOpen: boolean;
  toasts: Toast[];

  // Perfil
  updateProfile: (updates: Partial<UserProfile>) => void;
  setProfileName: (name: string) => void;
  updateAvatar: (config: Partial<AvatarConfig>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  toggleHardMode: () => { success: boolean; reason?: string };
  completeOnboarding: (name: string, gender?: 'male' | 'female', email?: string, whatsapp?: string) => void;

  // Recompensas (XP, Ryō, dano)
  isEliteActive: () => boolean;
  isSoldierPillActive: () => boolean;
  grantReward: (params: GrantParams) => RewardGrant | null;
  revokeReward: (key: string) => RewardGrant | null;
  hasGrant: (key: string) => boolean;
  addXp: (baseXp: number, pillarId: PillarId) => { finalXp: number; bonusXp: number; levelUp: boolean };
  adjustProgress: (xpDelta: number, ryoDelta: number, pillarId?: PillarId) => void;
  addRyo: (amount: number) => void;
  removeRyo: (amount: number) => void;
  closeLevelUpModal: () => void;

  // Equipamentos e inventário
  getEquippedItems: () => Item[];
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  syncInventory: () => void;
  addItemToInventory: (itemId: string) => void;

  // Loja
  buyItem: (itemId: string) => { success: boolean; reason?: string };
  buySoldierPill: () => { success: boolean; reason?: string };
  buyShieldScroll: () => { success: boolean; reason?: string };

  // Pergaminhos
  unlockTeachingCard: (cardId: string) => void;

  // Dias, sequência e desafio
  refreshToday: (options?: { silent?: boolean }) => void;
  checkDayTransition: () => void;
  recalculateStreak: () => { currentStreak: number; bestStreak: number };
  consumeWeeklyShield: () => boolean;
  toggleDailyCheckIn: (dayNumber?: number) => { success: boolean; reason?: string; isChecked?: boolean; ryoEarned?: number };
  startChallenge: (params?: { title?: string; targetDays?: number; startDate?: string; missions?: Mission[]; isEliteMode?: boolean }) => ProtocolChallengeCycle;
  startNewChallengeCycle: () => void;
  abandonChallenge: () => void;
  deleteActiveChallenge: () => void;
  updateActiveChallenge: (updates: { title?: string; targetDays?: number; isEliteMode?: boolean }) => void;
  deleteHistoryCycle: (cycleId: string) => void;
  clearChallengeHistory: () => void;
  restoreArchivedCycle: (cycleId: string) => boolean;
  reconcileChallengeFromMissions: () => void;
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
      const touch = (profile: UserProfile): UserProfile => ({ ...profile, updatedAt: new Date().toISOString() });

      const shieldContext = (profile: UserProfile): ShieldContext => ({
        isEliteMode: profile.isHardModeEnabled,
        equippedItems: profile.equippedItems.map((id) => allGameItems[id]).filter(Boolean),
        extraShieldWeeks: profile.extraShieldWeeks,
      });

      /** Aplica variações de XP/Ryō e cuida de nível, patente e Ryō de promoção. */
      const applyDelta = (xpDelta: number, ryoDelta: number, pillarId?: PillarId) => {
        const { profile } = get();
        const totalXp = Math.max(0, profile.totalXp + xpDelta);
        const oldLevel = profile.level;
        const newLevel = getLevelFromTotalXp(totalXp);
        const oldRank = profile.currentRankId;
        const newRank = getRankIdFromLevel(newLevel);

        let levelRyo = 0;
        if (newLevel > oldLevel) levelRyo = getLevelUpRyoBetween(oldLevel, newLevel);
        else if (newLevel < oldLevel) levelRyo = -getLevelUpRyoBetween(newLevel, oldLevel);

        const pillarXp = { ...profile.pillarXp };
        if (pillarId) pillarXp[pillarId] = Math.max(0, (pillarXp[pillarId] || 0) + xpDelta);

        set((state) => ({
          profile: touch({
            ...state.profile,
            totalXp,
            level: newLevel,
            currentRankId: newRank,
            pillarXp,
            ryo: Math.max(0, (state.profile.ryo || 0) + ryoDelta + levelRyo),
          }),
          activeLevelUpModal:
            newLevel > oldLevel ? { oldLevel, newLevel, oldRank, newRank } : state.activeLevelUpModal,
        }));

        if (newLevel > oldLevel) {
          if (newRank !== oldRank) soundFx.playRankUp();
          else soundFx.playLevelUp();
          triggerLevelUpConfetti();
        }
        return { levelUp: newLevel > oldLevel };
      };

      /** Encerra o ciclo ativo (falha ou conclusão) e abre o modal correspondente. */
      const archiveCycle = (cycle: ProtocolChallengeCycle, outcome: 'failed' | 'completed') => {
        if (outcome === 'completed') {
          const target = getCycleTargetDays(cycle);
          const reward = getChallengeCompletionReward(target);
          const grant = get().grantReward({
            key: `challenge:${cycle.id}`,
            label: `Desafio concluído: ${cycle.title || `${target} dias`}`,
            baseXp: reward.xp,
            baseRyo: reward.ryo,
            pillarId: 'chakra',
            applyXpBuffs: false,
            applyRyoBuffs: false,
          });
          const finished: ProtocolChallengeCycle = {
            ...cycle,
            rewardXp: grant?.xp ?? reward.xp,
            rewardRyo: grant?.ryo ?? reward.ryo,
          };
          set((state) => ({
            profile: touch({
              ...state.profile,
              activeChallenge: undefined,
              currentProtocolDay: 0,
              challengeHistory: [finished, ...(state.profile.challengeHistory || [])],
            }),
            activeCompletionModal: { cycle: finished },
          }));
          soundFx.playChallengeComplete();
          triggerChallengeCompleteConfetti();
        } else {
          set((state) => ({
            profile: touch({
              ...state.profile,
              activeChallenge: undefined,
              currentProtocolDay: 0,
              challengeHistory: [cycle, ...(state.profile.challengeHistory || [])],
            }),
            activeResetModal: { cycle },
          }));
          soundFx.playChallengeFailed();
        }
      };

      /** Reavalia o ciclo ativo com o histórico diário atual. */
      const evaluateActiveCycle = (today: string) => {
        const { profile } = get();
        const cycle = profile.activeChallenge;
        if (!cycle || cycle.status !== 'active') return;
        const result = evaluateChallengeCycle(cycle, profile.dayLog, today);
        if (result.outcome === 'active') {
          set((state) => ({
            profile: {
              ...state.profile,
              activeChallenge: result.cycle,
              currentProtocolDay: result.cycle.currentDay,
            },
          }));
        } else {
          archiveCycle(result.cycle, result.outcome);
        }
      };

      const recomputeDerived = (today: string) => {
        const { profile } = get();
        const ctx = shieldContext(profile);
        const week = getWeekKey(today);
        const capacity = getWeeklyShieldCapacity(ctx, week);
        const used = countShieldsUsedInWeek(profile.shieldedDates, week);
        const currentStreak = computeCurrentStreak(profile.dayLog, profile.shieldedDates, today);
        const bestStreak = Math.max(profile.bestStreak || 0, currentStreak);
        const completedDays = countCompletedDays(profile.dayLog);
        const unlockedCards = getReconciledUnlockedCards(completedDays);
        const newCards = unlockedCards.filter((id) => !profile.unlockedCards.includes(id));

        set((state) => ({
          profile: {
            ...state.profile,
            currentStreak,
            bestStreak,
            weeklyShieldsMax: capacity,
            weeklyShieldsRemaining: Math.max(0, capacity - used),
            unlockedCards,
          },
        }));

        if (newCards.length > 0 && profile.unlockedCards.length > 0) {
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
        activeLevelUpModal: null,
        activeResetModal: null,
        activeCompletionModal: null,
        isChallengeHistoryModalOpen: false,
        isChallengeMapModalOpen: false,
        isStartChallengeModalOpen: false,
        toasts: [],

        updateProfile: (updates) => set((state) => ({ profile: touch({ ...state.profile, ...updates }) })),

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
          get().recalculateStreak();
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
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            profile: { ...state.profile, grants: { ...state.profile.grants, [grant.key]: grant } },
          }));
          applyDelta(finalXp, finalRyo, pillarId);
          return grant;
        },

        revokeReward: (key) => {
          const grant = get().profile.grants?.[key];
          if (!grant) return null;
          const grants = { ...get().profile.grants };
          delete grants[key];
          set((state) => ({ profile: { ...state.profile, grants } }));

          if (grant.damage?.length) {
            const defeatedIds = useDuelStore.getState().revertStrike(grant.damage);
            defeatedIds.forEach((bossId) => get().revokeReward(`boss:${bossId}`));
          }
          applyDelta(-grant.xp, -grant.ryo, grant.pillarId);
          return grant;
        },

        addXp: (baseXp, pillarId) => {
          const { profile } = get();
          const { finalXp, bonusXp } = calculateXpGainWithBuffs(baseXp, pillarId, get().getEquippedItems(), {
            isEliteMode: profile.isHardModeEnabled,
            soldierPillActive: get().isSoldierPillActive(),
          });
          const { levelUp } = applyDelta(finalXp, 0, pillarId);
          return { finalXp, bonusXp, levelUp };
        },

        adjustProgress: (xpDelta, ryoDelta, pillarId) => {
          applyDelta(xpDelta, ryoDelta, pillarId);
        },

        addRyo: (amount) => applyDelta(0, Math.max(0, amount)),
        removeRyo: (amount) => applyDelta(0, -Math.max(0, amount)),
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
          get().recalculateStreak();
        },

        unequipItem: (itemId) => {
          set((state) => ({
            profile: touch({
              ...state.profile,
              equippedItems: state.profile.equippedItems.filter((id) => id !== itemId),
            }),
          }));
          get().recalculateStreak();
        },

        syncInventory: () => {
          const { profile } = get();
          const inventory = useDuelStore.getState().getDerivedInventory(profile.purchasedItems);
          const equippedItems = profile.equippedItems.filter((id) => inventory.includes(id));
          const bossesDefeated = useDuelStore.getState().adversaries.filter((a) => a.isDefeated).length;
          set((state) => ({ profile: { ...state.profile, inventory, equippedItems, bossesDefeated } }));
        },

        addItemToInventory: () => get().syncInventory(),

        // ── Loja ──────────────────────────────────────────────
        buyItem: (itemId) => {
          const { profile } = get();
          const item = allGameItems[itemId];
          if (!item || !item.shopPrice) return { success: false, reason: 'Item indisponível na loja.' };
          if (profile.inventory.includes(itemId)) return { success: false, reason: 'Você já possui este item.' };
          if (profile.ryo < item.shopPrice) {
            return { success: false, reason: `Faltam ${item.shopPrice - profile.ryo} Ryō para comprar.` };
          }
          set((state) => ({
            profile: touch({
              ...state.profile,
              ryo: state.profile.ryo - item.shopPrice!,
              purchasedItems: [...state.profile.purchasedItems, itemId],
            }),
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
          set((state) => ({
            profile: touch({
              ...state.profile,
              ryo: state.profile.ryo - SOLDIER_PILL_PRICE,
              soldierPillDates: [...state.profile.soldierPillDates.filter((d) => d >= addDaysToDateString(today, -30)), today],
            }),
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
          set((state) => ({
            profile: touch({
              ...state.profile,
              ryo: state.profile.ryo - SHIELD_SCROLL_PRICE,
              extraShieldWeeks: [...state.profile.extraShieldWeeks.slice(-12), week],
            }),
          }));
          get().recalculateStreak();
          soundFx.playShield();
          return { success: true };
        },

        unlockTeachingCard: () => get().recalculateStreak(),

        // ── Dia, sequência e desafio ──────────────────────────
        refreshToday: (options) => {
          const today = getTodayString();
          const missions = useHabitStore.getState().missions;
          const { profile } = get();
          const previous = profile.dayLog[today];
          const record = buildDayRecord(missions, today, false, previous);

          set((state) => ({ profile: { ...state.profile, dayLog: { ...state.profile.dayLog, [today]: record } } }));
          recomputeDerived(today);

          const key = `checkin:${today}`;
          const hasStipend = get().hasGrant(key);
          if (record.completed && !hasStipend) {
            const after = get().profile;
            const stipend = getDailyCheckInRyoBonus(after.currentStreak, after.level);
            get().grantReward({
              key,
              label: 'Dia Cumprido — estipêndio da vila',
              baseXp: 0,
              baseRyo: stipend,
              applyRyoBuffs: false,
            });
            if (!options?.silent) {
              soundFx.playDayComplete();
              triggerDayCompleteConfetti();
              get().pushToast({
                kind: 'success',
                title: 'Dia Cumprido! 完',
                message: `Meta diária alcançada. +${stipend} Ryō de estipêndio e sequência de ${after.currentStreak} ${after.currentStreak === 1 ? 'dia' : 'dias'}.`,
              });
            }
          } else if (!record.completed && hasStipend) {
            get().revokeReward(key);
          }

          evaluateActiveCycle(today);
        },

        checkDayTransition: () => {
          const today = getTodayString();
          const { profile } = get();
          if (profile.lastActiveDate === today) {
            get().refreshToday({ silent: true });
            return;
          }

          useHabitStore.getState().resetDailyMissionsIfNewDay();
          const missions = useHabitStore.getState().missions;

          const { dayLog, closedDates } = closePastDays(profile.dayLog, missions, profile.lastActiveDate, today);
          const shields = applyShieldsToClosedDays(dayLog, profile.shieldedDates, closedDates, shieldContext(profile));

          // Mantém só as recompensas que ainda podem ser desfeitas (hoje e ontem)
          const minDate = addDaysToDateString(today, -1);
          const grants: Record<string, RewardGrant> = {};
          Object.values(profile.grants || {}).forEach((g) => {
            if (g.date >= minDate) grants[g.key] = g;
          });

          set((state) => ({
            profile: touch({
              ...state.profile,
              dayLog,
              shieldedDates: shields.shieldedDates,
              grants,
              lastActiveDate: today,
            }),
          }));

          if (shields.newlyShielded.length > 0) {
            soundFx.playShield();
            get().pushToast({
              kind: 'shield',
              title: 'Escudo de Chakra ativado!',
              message:
                shields.newlyShielded.length === 1
                  ? 'Uma falta foi absorvida e sua sequência foi preservada.'
                  : `${shields.newlyShielded.length} faltas foram absorvidas e sua sequência foi preservada.`,
            });
          }

          useChallengeStore.getState().autoCompleteExpiredChallenges();
          get().refreshToday({ silent: true });
        },

        recalculateStreak: () => {
          recomputeDerived(getTodayString());
          const { currentStreak, bestStreak } = get().profile;
          return { currentStreak, bestStreak };
        },

        consumeWeeklyShield: () => false,

        /**
         * A presença agora é automática: o dia é marcado quando você atinge a meta mínima.
         * Mantido para compatibilidade — apenas informa o status atual.
         */
        toggleDailyCheckIn: () => {
          const missions = useHabitStore.getState().missions;
          const record = buildDayRecord(missions, getTodayString(), false);
          if (record.completed) {
            return { success: true, isChecked: true };
          }
          const target = Math.ceil(record.xpTarget * 0.5);
          return {
            success: false,
            isChecked: false,
            reason: `A presença é confirmada automaticamente ao atingir 50% do XP do dia (${record.xpEarned}/${target} XP).`,
          };
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
          if (startDate < today) startDate = today;
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
            status: 'active',
            currentDay: startDate === today ? 1 : 0,
            daysCompleted: 0,
            checkIns: {},
            totalXpEarned: 0,
            createdAt: new Date().toISOString(),
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
          get().refreshToday({ silent: true });
          return get().profile.activeChallenge || cycle;
        },

        abandonChallenge: () => {
          const { profile } = get();
          const cycle = profile.activeChallenge;
          if (!cycle || cycle.status !== 'active') return;
          const today = getTodayString();
          const archived: ProtocolChallengeCycle = {
            ...cycle,
            status: 'failed',
            endDate: today,
            failedReason: 'Encerrado pelo próprio shinobi',
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
          set((state) => ({
            profile: touch({
              ...state.profile,
              activeChallenge: undefined,
              currentProtocolDay: 0,
            }),
            activeResetModal: null,
            activeCompletionModal: null,
          }));
          get().refreshToday({ silent: true });
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
          get().refreshToday({ silent: true });
        },

        deleteHistoryCycle: (cycleId) => {
          set((state) => ({
            profile: touch({
              ...state.profile,
              challengeHistory: (state.profile.challengeHistory || []).filter((c) => c.id !== cycleId),
            }),
          }));
        },

        clearChallengeHistory: () => {
          set((state) => ({
            profile: touch({
              ...state.profile,
              challengeHistory: [],
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

          const candidate: ProtocolChallengeCycle = {
            ...target,
            status: 'active',
            endDate: undefined,
            failedReason: undefined,
            failedWeek: undefined,
          };
          const result = evaluateChallengeCycle(candidate, profile.dayLog, getTodayString());
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
          get().refreshToday({ silent: true });
          return true;
        },

        reconcileChallengeFromMissions: () => get().refreshToday({ silent: true }),

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
      version: 2,
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
          profile: migrateProfile({ ...createDefaultProfile(), ...(state.profile || {}) }, readPersistedMissions()),
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
