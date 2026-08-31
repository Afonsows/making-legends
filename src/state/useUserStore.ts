import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, AvatarConfig, NotificationSettings, Item } from '../core/types';
import { PillarId, UserRankId } from '../theme/types';
import { getLevelFromTotalXp, getRankIdFromLevel, calculateXpGainWithBuffs } from '../core/xpEngine';
import { getTodayString, processDayTransition } from '../core/streakEngine';
import { allGameItems } from '../core/itemsData';
import { soundFx } from '../utils/audio';
import { triggerLevelUpConfetti } from '../utils/confetti';

const defaultProfile: UserProfile = {
  id: 'user_shinobi_01',
  name: 'Afonso',
  email: 'afonso7010@gmail.com',
  gender: 'male',
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
  createdAt: new Date().toISOString(),
};

interface UserStoreState {
  profile: UserProfile;
  activeLevelUpModal: { oldLevel: number; newLevel: number; oldRank: UserRankId; newRank: UserRankId } | null;
  
  // Actions
  updateProfile: (updates: Partial<UserProfile>) => void;
  setProfileName: (name: string) => void;
  updateAvatar: (config: Partial<AvatarConfig>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  toggleHardMode: () => void;
  completeOnboarding: (name: string, gender?: 'male' | 'female', email?: string, whatsapp?: string) => void;
  
  // XP & Progression
  addXp: (baseXp: number, pillarId: PillarId) => { finalXp: number; bonusXp: number; levelUp: boolean };
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

        set((state) => ({
          profile: {
            ...state.profile,
            totalXp: newTotalXp,
            level: newLevel,
            currentRankId: newRank,
            pillarXp: newPillarXp,
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

        // Se já está equipado, não faz nada
        if (profile.equippedItems.includes(itemId)) return;

        // Remove outro item do mesmo slot se houver
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

      checkDayTransition: () => {
        const { profile } = get();
        const today = getTodayString();

        if (profile.lastActiveDate === today) {
          return;
        }

        const transition = processDayTransition(profile, today);

        if (transition.updatedProfile && Object.keys(transition.updatedProfile).length > 0) {
          set((state) => ({
            profile: {
              ...state.profile,
              ...transition.updatedProfile,
            },
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
    }),
    {
      name: 'shinobi_user_store_v1',
    }
  )
);
