import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, AvatarConfig, NotificationSettings, Item, ProtocolChallengeCycle } from '../core/types';
import { PillarId, UserRankId } from '../theme/types';
import { getLevelFromTotalXp, getRankIdFromLevel, calculateXpGainWithBuffs } from '../core/xpEngine';
import { getLevelUpRyoReward, getDailyCheckInRyoBonus } from '../core/ryoEngine';
import { 
  getTodayString, 
  processDayTransition, 
  ensureActiveChallenge, 
  calculateDailyXpProgress, 
  createNewChallengeCycle,
  getAllChallengePresenceDates,
  calculateChallengeStreak,
  reconcileChallengeCycleWithMissions
} from '../core/streakEngine';
import { allGameItems } from '../core/itemsData';
import { teachingCards } from '../core/cardsData';
import { soundFx } from '../utils/audio';
import { triggerLevelUpConfetti, triggerMissionConfetti } from '../utils/confetti';
import { useHabitStore } from './useHabitStore';
import { useChallengeStore } from './useChallengeStore';

/**
 * Retorna a lista estrita de IDs de pergaminhos desbloqueados com base no dia atual do protocolo.
 * Nenhum pergaminho com unlockedDay > currentDay pode estar desbloqueado.
 */
export function getReconciledUnlockedCards(currentDay: number): string[] {
  const validDay = Math.min(66, Math.max(1, currentDay));
  return teachingCards
    .filter((card) => card.unlockedDay <= validDay)
    .map((card) => card.id);
}

const defaultProfile: UserProfile = {
  id: 'user_shinobi_01',
  name: 'Afonso',
  email: 'afonso7010@gmail.com',
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
  pillarXp: {
    taijutsu: 0,
    ninjutsu: 0,
    chakra: 0,
    espirito: 0,
    genjutsu: 0,
  },
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
    enabled: true,
    soundEnabled: true,
  },
  subscriptionStatus: 'trial',
  hasCompletedOnboarding: false,
  unlockedCards: ['card_tai_01'], // Dia 1 apenas
  equippedItems: ['pesos_ferro_negro'],
  inventory: ['pesos_ferro_negro', 'pergaminho_da_sabedoria_antiga'],
  activeChallenge: undefined,
  challengeHistory: [],
  createdAt: new Date().toISOString(),
};

interface UserStoreState {
  profile: UserProfile;
  activeLevelUpModal: { oldLevel: number; newLevel: number; oldRank: UserRankId; newRank: UserRankId } | null;
  activeResetModal: { cycle: ProtocolChallengeCycle } | null;
  activeCompletionModal: { cycle: ProtocolChallengeCycle } | null;
  isChallengeHistoryModalOpen: boolean;
  isChallengeMapModalOpen: boolean;
  isStartChallengeModalOpen: boolean;
  
  // Actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  setProfileName: (name: string) => void;
  updateAvatar: (config: Partial<AvatarConfig>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  toggleHardMode: () => void;
  completeOnboarding: (name: string, gender?: 'male' | 'female', email?: string, whatsapp?: string) => void;
  
  // XP, Ryō & Progression
  addXp: (baseXp: number, pillarId: PillarId) => { finalXp: number; bonusXp: number; levelUp: boolean };
  removeXp: (baseXp: number, pillarId: PillarId) => void;
  addRyo: (amount: number) => void;
  removeRyo: (amount: number) => void;
  closeLevelUpModal: () => void;
  
  // Equip & Inventory
  getEquippedItems: () => Item[];
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  addItemToInventory: (itemId: string) => void;
  
  // Teaching Cards
  unlockTeachingCard: (cardId: string) => void;
  
  // Day checking & streaks
  checkDayTransition: () => void;
  recalculateStreak: () => { currentStreak: number; bestStreak: number };
  consumeWeeklyShield: () => boolean;

  // Challenge Lifecycle & Daily Presence Check-in
  toggleDailyCheckIn: (dayNumber?: number) => { success: boolean; reason?: string; isChecked?: boolean; ryoEarned?: number };
  startChallenge: (params?: { title?: string; targetDays?: number; startDate?: string; missions?: any[] }) => ProtocolChallengeCycle;
  startNewChallengeCycle: () => void;
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
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      activeLevelUpModal: null,
      activeResetModal: null,
      activeCompletionModal: null,
      isChallengeHistoryModalOpen: false,
      isChallengeMapModalOpen: false,
      isStartChallengeModalOpen: false,

      updateProfile: (updates) => {
        set((state) => ({
          profile: {
            ...state.profile,
            ...updates,
          },
        }));
      },

      setProfileName: (name: string) => {
        set((state) => ({
          profile: { ...state.profile, name: name.trim() || 'Aspirante Shinobi' },
        }));
      },

      updateAvatar: (config: Partial<AvatarConfig>) => {
        set((state) => ({
          profile: {
            ...state.profile,
            avatarConfig: { ...state.profile.avatarConfig, ...config },
          },
        }));
      },

      updateNotifications: (settings: Partial<NotificationSettings>) => {
        set((state) => ({
          profile: {
            ...state.profile,
            notificationSettings: { ...state.profile.notificationSettings, ...settings },
          },
        }));
      },

      toggleHardMode: () => {
        set((state) => ({
          profile: {
            ...state.profile,
            isHardModeEnabled: !state.profile.isHardModeEnabled,
          },
        }));
      },

      completeOnboarding: (name: string, gender: 'male' | 'female' = 'male', email?: string, whatsapp?: string) => {
        set((state) => ({
          profile: {
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
            currentProtocolDay: 0,
            currentStreak: 0,
            activeChallenge: undefined,
            lastActiveDate: getTodayString(),
          },
          isStartChallengeModalOpen: true,
        }));
      },

      addXp: (baseXp: number, pillarId: PillarId) => {
        const { profile } = get();
        const equipped = get().getEquippedItems();

        const { finalXp, bonusXp } = calculateXpGainWithBuffs(
          baseXp,
          pillarId,
          equipped
        );

        const newTotalXp = profile.totalXp + finalXp;
        const newLevel = getLevelFromTotalXp(newTotalXp);
        const oldLevel = profile.level;
        const oldRank = profile.currentRankId;
        const newRank = getRankIdFromLevel(newLevel);

        const newPillarXp = {
          ...profile.pillarXp,
          [pillarId]: (profile.pillarXp[pillarId] || 0) + finalXp,
        };

        const hasLeveledUp = newLevel > oldLevel;

        const levelUpRyoReward = hasLeveledUp ? getLevelUpRyoReward(newLevel) : 0;

        set((state) => ({
          profile: {
            ...state.profile,
            totalXp: newTotalXp,
            level: newLevel,
            currentRankId: newRank,
            pillarXp: newPillarXp,
            ryo: (state.profile.ryo || 0) + levelUpRyoReward,
          },
          activeLevelUpModal: hasLeveledUp
            ? {
                oldLevel,
                newLevel,
                oldRank,
                newRank,
              }
            : state.activeLevelUpModal,
        }));

        if (hasLeveledUp) {
          soundFx.playLevelUp();
          triggerLevelUpConfetti();
        }

        return { finalXp, bonusXp, levelUp: hasLeveledUp };
      },

      removeXp: (baseXp: number, pillarId: PillarId) => {
        const { profile } = get();
        const equipped = get().getEquippedItems();

        const { finalXp } = calculateXpGainWithBuffs(
          baseXp,
          pillarId,
          equipped
        );

        const oldLevel = profile.level;
        const newTotalXp = Math.max(0, profile.totalXp - finalXp);
        const newLevel = getLevelFromTotalXp(newTotalXp);
        const newRank = getRankIdFromLevel(newLevel);

        const newPillarXp = {
          ...profile.pillarXp,
          [pillarId]: Math.max(0, (profile.pillarXp[pillarId] || 0) - finalXp),
        };

        let lostLevelUpRyo = 0;
        if (newLevel < oldLevel) {
          for (let lvl = oldLevel; lvl > newLevel; lvl--) {
            lostLevelUpRyo += getLevelUpRyoReward(lvl);
          }
        }

        const newRyo = Math.max(0, (profile.ryo || 0) - lostLevelUpRyo);

        set((state) => ({
          profile: {
            ...state.profile,
            totalXp: newTotalXp,
            level: newLevel,
            currentRankId: newRank,
            pillarXp: newPillarXp,
            ryo: newRyo,
          },
        }));
      },

      addRyo: (amount: number) => {
        set((state) => ({
          profile: {
            ...state.profile,
            ryo: (state.profile.ryo || 0) + amount,
          },
        }));
      },

      removeRyo: (amount: number) => {
        set((state) => ({
          profile: {
            ...state.profile,
            ryo: Math.max(0, (state.profile.ryo || 0) - amount),
          },
        }));
      },

      closeLevelUpModal: () => {
        set({ activeLevelUpModal: null });
      },

      getEquippedItems: () => {
        const { profile } = get();
        return profile.equippedItems
          .map((id) => allGameItems[id])
          .filter(Boolean);
      },

      equipItem: (itemId: string) => {
        const { profile } = get();
        const item = allGameItems[itemId];
        if (!item) return;

        if (profile.equippedItems.includes(itemId)) return;

        const currentEquipped = profile.equippedItems
          .map((id) => allGameItems[id])
          .filter(Boolean);
        const otherSlots = currentEquipped
          .filter((i) => i.type !== item.type)
          .map((i) => i.id);

        set((state) => ({
          profile: {
            ...state.profile,
            equippedItems: [...otherSlots, itemId],
          },
        }));
      },

      unequipItem: (itemId: string) => {
        set((state) => ({
          profile: {
            ...state.profile,
            equippedItems: state.profile.equippedItems.filter((id) => id !== itemId),
          },
        }));
      },

      addItemToInventory: (itemId: string) => {
        const { profile } = get();
        if (!profile.inventory.includes(itemId)) {
          set((state) => ({
            profile: {
              ...state.profile,
              inventory: [...state.profile.inventory, itemId],
            },
          }));
        }
      },

      unlockTeachingCard: (cardId: string) => {
        const { profile } = get();
        const currentDay = Math.min(
          66,
          Math.max(1, profile.activeChallenge?.currentDay || profile.currentProtocolDay || 1)
        );
        const targetCard = teachingCards.find((c) => c.id === cardId);
        if (targetCard && targetCard.unlockedDay <= currentDay) {
          if (!profile.unlockedCards.includes(cardId)) {
            set((state) => ({
              profile: {
                ...state.profile,
                unlockedCards: [...state.profile.unlockedCards, cardId],
              },
            }));
          }
        }
      },

      recalculateStreak: () => {
        const { profile } = get();
        const customChallenges = useChallengeStore.getState().challenges || [];
        const missions = useHabitStore.getState().missions || [];
        const presenceDates = getAllChallengePresenceDates(profile, customChallenges, missions);
        const streakResult = calculateChallengeStreak(presenceDates);

        const newStreak = streakResult.currentStreak;
        const bestStreak = Math.max(profile.bestStreak || 0, streakResult.bestStreak, newStreak);

        if (profile.currentStreak !== newStreak || profile.bestStreak !== bestStreak) {
          set((state) => ({
            profile: {
              ...state.profile,
              currentStreak: newStreak,
              bestStreak,
            },
          }));
        }

        return { currentStreak: newStreak, bestStreak };
      },

      checkDayTransition: () => {
        const { profile } = get();
        const today = getTodayString();
        const missions = useHabitStore.getState().missions;
        const customChallenges = useChallengeStore.getState().challenges || [];

        // Reconciliação preventiva: garante que presenças de missões não sejam perdidas
        const reconciliation = reconcileChallengeCycleWithMissions(profile, missions, customChallenges);
        let activeProfile = profile;
        if (reconciliation.reconciledProfile && Object.keys(reconciliation.reconciledProfile).length > 0) {
          activeProfile = {
            ...profile,
            ...reconciliation.reconciledProfile,
          };
          set((state) => ({
            profile: {
              ...state.profile,
              ...reconciliation.reconciledProfile,
            },
            activeResetModal: null,
          }));
        }

        if (activeProfile.lastActiveDate === today) {
          // Reconcilia a sequência de presença
          get().recalculateStreak();
          return;
        }

        const transition = processDayTransition(activeProfile, today, missions, customChallenges);

        if (transition.updatedProfile && Object.keys(transition.updatedProfile).length > 0) {
          const hasActive = Boolean(transition.updatedProfile.activeChallenge && transition.updatedProfile.activeChallenge.status === 'active');
          const newCurrentDay = hasActive
            ? Math.min(
                66,
                Math.max(
                  1,
                  transition.updatedProfile.activeChallenge?.currentDay ||
                    transition.updatedProfile.currentProtocolDay ||
                    1
                )
              )
            : 0;
          const syncedCards = newCurrentDay > 0
            ? getReconciledUnlockedCards(newCurrentDay)
            : (activeProfile.unlockedCards || ['card_tai_01']);

          set((state) => ({
            profile: {
              ...state.profile,
              ...transition.updatedProfile,
              unlockedCards: syncedCards,
            },
            activeResetModal: transition.resetOccurred && transition.archivedCycle
              ? { cycle: transition.archivedCycle }
              : state.activeResetModal,
            activeCompletionModal: transition.completedOccurred && transition.completedCycle
              ? { cycle: transition.completedCycle }
              : state.activeCompletionModal,
          }));
        }
      },

      consumeWeeklyShield: () => {
        const { profile } = get();
        if (profile.weeklyShieldsRemaining > 0) {
          set((state) => ({
            profile: {
              ...state.profile,
              weeklyShieldsRemaining: state.profile.weeklyShieldsRemaining - 1,
            },
          }));
          return true;
        }
        return false;
      },

      toggleDailyCheckIn: (dayNumber?: number) => {
        const { profile } = get();
        if (!profile.activeChallenge || profile.activeChallenge.status !== 'active') {
          return {
            success: false,
            reason: 'Você não possui nenhum desafio ativo no momento. Personalize e inicie um desafio para marcar presença!',
            isChecked: false,
          };
        }

        const activeCycle = profile.activeChallenge;
        const missions = useHabitStore.getState().missions;
        const xpProgress = calculateDailyXpProgress(missions);

        const targetDay = dayNumber !== undefined 
          ? Math.min(66, Math.max(1, dayNumber)) 
          : Math.min(66, Math.max(1, activeCycle.currentDay || profile.currentProtocolDay || 1));

        const currentlyChecked = Boolean(activeCycle.checkIns[targetDay]?.checked);

        // Se está tentando marcar e ainda não atingiu 50% de XP
        if (!currentlyChecked && !xpProgress.isUnlocked) {
          return {
            success: false,
            reason: `Você precisa atingir pelo menos 50% do XP previsto de hoje (${xpProgress.currentXp}/${xpProgress.target50PctXp} XP) para marcar presença!`,
            isChecked: false,
          };
        }

        const willBeChecked = !currentlyChecked;
        const todayStr = getTodayString();
        const cycleStartDate = activeCycle.startDate || profile.lastActiveDate || todayStr;

        let recordDate = todayStr;
        if (targetDay === (activeCycle.currentDay || profile.currentProtocolDay || 1)) {
          recordDate = todayStr;
        } else {
          // Se for outro dia do ciclo, deriva a data a partir de startDate
          const [y, m, d] = cycleStartDate.split('-').map(Number);
          const computedDate = new Date(y, m - 1, d + (targetDay - 1));
          recordDate = `${computedDate.getFullYear()}-${String(computedDate.getMonth() + 1).padStart(2, '0')}-${String(computedDate.getDate()).padStart(2, '0')}`;
        }

        const updatedCheckIns = {
          ...activeCycle.checkIns,
          [targetDay]: {
            dayNumber: targetDay,
            date: recordDate,
            checked: willBeChecked,
            xpEarned: willBeChecked ? xpProgress.currentXp : 0,
            targetXp: xpProgress.totalTargetXp,
            checkedAt: willBeChecked ? new Date().toISOString() : undefined,
          },
        };

        const daysCompleted = Object.values(updatedCheckIns).filter((r) => r.checked).length;
        const totalXpEarned = Object.values(updatedCheckIns).reduce((acc, r) => acc + (r.checked ? r.xpEarned : 0), 0);

        const updatedCycle: ProtocolChallengeCycle = {
          ...activeCycle,
          daysCompleted,
          totalXpEarned,
          checkIns: updatedCheckIns,
        };

        // Recalcula a sequência estritamente a partir das presenças em desafios (com garantia de não-duplicação)
        const customChallenges = useChallengeStore.getState().challenges || [];
        const candidateProfile: UserProfile = {
          ...profile,
          activeChallenge: updatedCycle,
        };
        const presenceDates = getAllChallengePresenceDates(candidateProfile, customChallenges, missions);
        const streakResult = calculateChallengeStreak(presenceDates, todayStr);

        const newStreak = streakResult.currentStreak;
        const bestStreak = Math.max(profile.bestStreak || 0, streakResult.bestStreak, newStreak);
        const dailyRyoStipend = getDailyCheckInRyoBonus(newStreak, profile.level);

        if (willBeChecked) {
          soundFx.playMissionComplete();
          triggerMissionConfetti();
        }

        const newRyo = willBeChecked
          ? (profile.ryo || 0) + dailyRyoStipend
          : Math.max(0, (profile.ryo || 0) - dailyRyoStipend);

        set((state) => ({
          profile: {
            ...state.profile,
            currentStreak: newStreak,
            bestStreak,
            ryo: newRyo,
            activeChallenge: updatedCycle,
          },
        }));

        return {
          success: true,
          isChecked: willBeChecked,
          ryoEarned: willBeChecked ? dailyRyoStipend : 0,
        };
      },

      startChallenge: (params) => {
        const { profile } = get();
        const history = profile.challengeHistory || [];
        const nextCycleNum = (history.length || 0) + 1;
        const todayStr = getTodayString();
        const startDate = params?.startDate || todayStr;

        const newCycle: ProtocolChallengeCycle = {
          id: `cycle_${nextCycleNum}_${Date.now()}`,
          cycleNumber: nextCycleNum,
          startDate,
          status: 'active',
          currentDay: 1,
          daysCompleted: 0,
          checkIns: {},
          totalXpEarned: 0,
          createdAt: new Date().toISOString(),
        };

        if (params?.missions && params.missions.length > 0) {
          useHabitStore.getState().setCustomMissionList(params.missions);
        }

        const syncedCards = getReconciledUnlockedCards(1);

        set((state) => ({
          profile: {
            ...state.profile,
            activeChallenge: newCycle,
            currentProtocolDay: 1,
            unlockedCards: syncedCards,
          },
          activeResetModal: null,
          activeCompletionModal: null,
          isStartChallengeModalOpen: false,
        }));

        soundFx.playLevelUp();
        triggerLevelUpConfetti();
        get().recalculateStreak();

        return newCycle;
      },

      startNewChallengeCycle: () => {
        const { profile } = get();
        const todayStr = getTodayString();
        const history = [...(profile.challengeHistory || [])];

        // Se houver um ciclo ativo sendo reiniciado manualmente, arquiva antes
        if (profile.activeChallenge && profile.activeChallenge.status === 'active') {
          const archived: ProtocolChallengeCycle = {
            ...profile.activeChallenge,
            endDate: todayStr,
            status: profile.activeChallenge.daysCompleted >= 50 ? 'completed' : 'failed',
            failedReason: profile.activeChallenge.daysCompleted >= 50 ? 'Concluído com Honra' : 'Reiniciado pelo Usuário',
          };

          set((state) => ({
            profile: {
              ...state.profile,
              activeChallenge: undefined,
              currentProtocolDay: 0,
              challengeHistory: [archived, ...history],
            },
            isStartChallengeModalOpen: true,
            activeResetModal: null,
          }));
        } else {
          set({ isStartChallengeModalOpen: true, activeResetModal: null });
        }
      },

      restoreArchivedCycle: (cycleId: string) => {
        const { profile } = get();
        const history = profile.challengeHistory || [];
        const cycleToRestore = history.find((c) => c.id === cycleId);
        if (!cycleToRestore) return false;

        const remainingHistory = history.filter((c) => c.id !== cycleId);
        const restoredCycle: ProtocolChallengeCycle = {
          ...cycleToRestore,
          status: 'active',
          endDate: undefined,
          failedReason: undefined,
          failedWeek: undefined,
        };

        const targetDay = restoredCycle.currentDay || Math.max(1, restoredCycle.daysCompleted);
        const syncedCards = getReconciledUnlockedCards(targetDay);

        set((state) => ({
          profile: {
            ...state.profile,
            activeChallenge: restoredCycle,
            challengeHistory: remainingHistory,
            currentProtocolDay: targetDay,
            unlockedCards: syncedCards,
          },
          activeResetModal: null,
        }));

        get().recalculateStreak();
        return true;
      },

      reconcileChallengeFromMissions: () => {
        const { profile } = get();
        const missions = useHabitStore.getState().missions;
        const customChallenges = useChallengeStore.getState().challenges || [];

        const reconciliation = reconcileChallengeCycleWithMissions(profile, missions, customChallenges);
        if (reconciliation.reconciledProfile && Object.keys(reconciliation.reconciledProfile).length > 0) {
          const currentDay = reconciliation.reconciledProfile.currentProtocolDay || profile.currentProtocolDay || 1;
          const syncedCards = getReconciledUnlockedCards(currentDay);

          set((state) => ({
            profile: {
              ...state.profile,
              ...reconciliation.reconciledProfile,
              unlockedCards: syncedCards,
            },
            activeResetModal: null,
          }));
        }
      },

      dismissResetModal: () => {
        set({ activeResetModal: null });
      },

      dismissCompletionModal: () => {
        set({ activeCompletionModal: null });
      },

      openChallengeHistoryModal: () => {
        set({ isChallengeHistoryModalOpen: true });
      },

      closeChallengeHistoryModal: () => {
        set({ isChallengeHistoryModalOpen: false });
      },

      openChallengeMapModal: () => {
        set({ isChallengeMapModalOpen: true });
      },

      closeChallengeMapModal: () => {
        set({ isChallengeMapModalOpen: false });
      },

      openStartChallengeModal: () => {
        set({ isStartChallengeModalOpen: true });
      },

      closeStartChallengeModal: () => {
        set({ isStartChallengeModalOpen: false });
      },
    }),
    {
      name: 'shinobi_user_store_v1',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reconcilia e cura o ciclo dos 66 dias a partir das missões
          setTimeout(() => {
            state.reconcileChallengeFromMissions?.();
          }, 0);

          // Reconcilia os pergaminhos desbloqueados com o dia atual do protocolo
          const currentDay = Math.min(
            66,
            Math.max(
              1,
              state.profile.activeChallenge?.currentDay || state.profile.currentProtocolDay || 1
            )
          );
          const reconciled = getReconciledUnlockedCards(currentDay);

          const currentList = state.profile.unlockedCards || [];
          const currentSet = new Set(currentList);
          const hasInvalidCards = currentList.some((id) => !reconciled.includes(id));
          const hasMissingCards = reconciled.some((id) => !currentSet.has(id));

          if (hasInvalidCards || hasMissingCards) {
            state.updateProfile({ unlockedCards: reconciled });
          }

          // Garante a autocorreção do streak com base nas presenças reais salvas
          setTimeout(() => {
            state.recalculateStreak?.();
          }, 0);
        }
      },
    }
  )
);

