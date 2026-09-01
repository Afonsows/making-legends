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
  createNewChallengeCycle 
} from '../core/streakEngine';
import { allGameItems } from '../core/itemsData';
import { soundFx } from '../utils/audio';
import { triggerLevelUpConfetti, triggerMissionConfetti } from '../utils/confetti';
import { useHabitStore } from './useHabitStore';

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
  currentProtocolDay: 1,
  currentStreak: 1,
  bestStreak: 1,
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
  unlockedCards: ['card_tai_01', 'card_nin_01', 'card_cha_01', 'card_esp_01', 'card_gen_01'],
  equippedItems: ['pesos_ferro_negro'],
  inventory: ['pesos_ferro_negro', 'pergaminho_da_sabedoria_antiga'],
  activeChallenge: createNewChallengeCycle(1, getTodayString()),
  challengeHistory: [],
  createdAt: new Date().toISOString(),
};

interface UserStoreState {
  profile: UserProfile;
  activeLevelUpModal: { oldLevel: number; newLevel: number; oldRank: UserRankId; newRank: UserRankId } | null;
  activeResetModal: { cycle: ProtocolChallengeCycle } | null;
  isChallengeHistoryModalOpen: boolean;
  isChallengeMapModalOpen: boolean;
  
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
  consumeWeeklyShield: () => boolean;

  // 66-Day Challenge & Daily Presence Check-in
  toggleDailyCheckIn: (dayNumber?: number) => { success: boolean; reason?: string; isChecked?: boolean };
  startNewChallengeCycle: () => void;
  dismissResetModal: () => void;
  openChallengeHistoryModal: () => void;
  closeChallengeHistoryModal: () => void;
  openChallengeMapModal: () => void;
  closeChallengeMapModal: () => void;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      activeLevelUpModal: null,

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
            currentProtocolDay: 1,
            currentStreak: 1,
            lastActiveDate: getTodayString(),
          },
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

        const newTotalXp = Math.max(0, profile.totalXp - finalXp);
        const newLevel = getLevelFromTotalXp(newTotalXp);
        const newRank = getRankIdFromLevel(newLevel);

        const newPillarXp = {
          ...profile.pillarXp,
          [pillarId]: Math.max(0, (profile.pillarXp[pillarId] || 0) - finalXp),
        };

        set((state) => ({
          profile: {
            ...state.profile,
            totalXp: newTotalXp,
            level: newLevel,
            currentRankId: newRank,
            pillarXp: newPillarXp,
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
        if (!profile.unlockedCards.includes(cardId)) {
          set((state) => ({
            profile: {
              ...state.profile,
              unlockedCards: [...state.profile.unlockedCards, cardId],
            },
          }));
        }
      },

      activeResetModal: null,
      isChallengeHistoryModalOpen: false,
      isChallengeMapModalOpen: false,

      checkDayTransition: () => {
        const { profile } = get();
        const today = getTodayString();
        const missions = useHabitStore.getState().missions;

        if (profile.lastActiveDate === today) {
          return;
        }

        const transition = processDayTransition(profile, today, missions);

        if (transition.updatedProfile && Object.keys(transition.updatedProfile).length > 0) {
          set((state) => ({
            profile: {
              ...state.profile,
              ...transition.updatedProfile,
            },
            activeResetModal: transition.resetOccurred && transition.archivedCycle
              ? { cycle: transition.archivedCycle }
              : state.activeResetModal,
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
        const missions = useHabitStore.getState().missions;
        const xpProgress = calculateDailyXpProgress(missions);

        const activeCycle = ensureActiveChallenge(profile);
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

        const updatedCheckIns = {
          ...activeCycle.checkIns,
          [targetDay]: {
            dayNumber: targetDay,
            date: todayStr,
            checked: willBeChecked,
            xpEarned: xpProgress.currentXp,
            targetXp: xpProgress.totalTargetXp,
            checkedAt: new Date().toISOString(),
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

        let newStreak = profile.currentStreak;
        const dailyRyoStipend = getDailyCheckInRyoBonus(newStreak, profile.level);

        if (willBeChecked) {
          soundFx.playMissionComplete();
          triggerMissionConfetti();
        }

        const bestStreak = Math.max(profile.bestStreak, newStreak);
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

      startNewChallengeCycle: () => {
        const { profile } = get();
        const todayStr = getTodayString();
        const activeCycle = ensureActiveChallenge(profile);
        const history = [...(profile.challengeHistory || [])];

        const archived: ProtocolChallengeCycle = {
          ...activeCycle,
          endDate: todayStr,
          status: activeCycle.daysCompleted >= 50 ? 'completed' : 'failed',
          failedReason: activeCycle.daysCompleted >= 50 ? 'Concluído com Honra' : 'Reiniciado pelo Usuário',
        };

        const nextCycleNum = (activeCycle.cycleNumber || 1) + 1;
        const newCycle = createNewChallengeCycle(nextCycleNum, todayStr);

        set((state) => ({
          profile: {
            ...state.profile,
            currentProtocolDay: 1,
            currentStreak: 1,
            activeChallenge: newCycle,
            challengeHistory: [archived, ...history],
          },
          activeResetModal: null,
        }));
      },

      dismissResetModal: () => {
        set({ activeResetModal: null });
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
    }),
    {
      name: 'shinobi_user_store_v1',
    }
  )
);

