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
  name: 'Aspirante das Sombras',
  avatarConfig: {
    silhouette: 'shadow',
    outfit: 'tunic_dark',
    headband: 'iron_slate',
    auraColor: 'chakra',
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
  setProfileName: (name: string) => void;
  updateAvatar: (config: Partial<AvatarConfig>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  toggleHardMode: () => void;
  completeOnboarding: (name: string, customGoals?: string[]) => void;
  
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

      setProfileName: (name: string) => {
        set((state) => ({
          profile: { ...state.profile, name }
        }));
      },

      updateAvatar: (config: Partial<AvatarConfig>) => {
        set((state) => ({
          profile: {
            ...state.profile,
            avatarConfig: { ...state.profile.avatarConfig, ...config }
          }
        }));
      },

      updateNotifications: (settings: Partial<NotificationSettings>) => {
        set((state) => ({
          profile: {
            ...state.profile,
            notificationSettings: { ...state.profile.notificationSettings, ...settings }
          }
        }));
        if (typeof settings.soundEnabled === 'boolean') {
          soundFx.setSoundEnabled(settings.soundEnabled);
        }
      },

      toggleHardMode: () => {
        set((state) => ({
          profile: {
            ...state.profile,
            isHardModeEnabled: !state.profile.isHardModeEnabled
          }
        }));
      },

      completeOnboarding: (name: string) => {
        set((state) => ({
          profile: {
            ...state.profile,
            name: name.trim() || 'Shinobi Lendário',
            hasCompletedOnboarding: true,
            lastActiveDate: getTodayString(),
          }
        }));
      },

      getEquippedItems: () => {
        const { equippedItems } = get().profile;
        return equippedItems
          .map((id) => allGameItems[id])
          .filter(Boolean);
      },

      addXp: (baseXp: number, pillarId: PillarId) => {
        const { profile } = get();
        const equipped = get().getEquippedItems();
        
        const { finalXp, bonusXp } = calculateXpGainWithBuffs(baseXp, pillarId, equipped);
        
        const newTotalXp = profile.totalXp + finalXp;
        const newLevel = getLevelFromTotalXp(newTotalXp);
        const oldLevel = profile.level;
        const oldRank = profile.currentRankId;
        const newRank = getRankIdFromLevel(newLevel);
        
        const levelUp = newLevel > oldLevel;
        
        set((state) => ({
          profile: {
            ...state.profile,
            totalXp: newTotalXp,
            level: newLevel,
            currentRankId: newRank,
            pillarXp: {
              ...state.profile.pillarXp,
              [pillarId]: (state.profile.pillarXp[pillarId] || 0) + finalXp
            }
          },
          activeLevelUpModal: levelUp 
            ? { oldLevel, newLevel, oldRank, newRank }
            : state.activeLevelUpModal
        }));

        if (levelUp) {
          soundFx.playLevelUp();
          triggerLevelUpConfetti();
        }

        return { finalXp, bonusXp, levelUp };
      },

      closeLevelUpModal: () => {
        set({ activeLevelUpModal: null });
      },

      equipItem: (itemId: string) => {
        const { profile } = get();
        if (!profile.inventory.includes(itemId)) return;
        if (profile.equippedItems.includes(itemId)) return;

        // Limite de até 3 relíquias equipadas simultaneamente
        const newEquipped = [...profile.equippedItems, itemId].slice(-3);
        set((state) => ({
          profile: { ...state.profile, equippedItems: newEquipped }
        }));
      },

      unequipItem: (itemId: string) => {
        set((state) => ({
          profile: {
            ...state.profile,
            equippedItems: state.profile.equippedItems.filter((id) => id !== itemId)
          }
        }));
      },

      addItemToInventory: (itemId: string) => {
        const { profile } = get();
        if (profile.inventory.includes(itemId)) return;
        set((state) => ({
          profile: {
            ...state.profile,
            inventory: [...state.profile.inventory, itemId]
          }
        }));
      },

      unlockTeachingCard: (cardId: string) => {
        const { profile } = get();
        if (profile.unlockedCards.includes(cardId)) return;
        set((state) => ({
          profile: {
            ...state.profile,
            unlockedCards: [...state.profile.unlockedCards, cardId]
          }
        }));
      },

      checkDayTransition: () => {
        const { profile } = get();
        const todayStr = getTodayString();
        const { updatedProfile } = processDayTransition(profile, todayStr);
        
        if (Object.keys(updatedProfile).length > 0) {
          set((state) => ({
            profile: { ...state.profile, ...updatedProfile }
          }));
        }
      },

      consumeWeeklyShield: () => {
        const { profile } = get();
        if (profile.weeklyShieldsRemaining <= 0) return false;
        
        set((state) => ({
          profile: {
            ...state.profile,
            weeklyShieldsRemaining: state.profile.weeklyShieldsRemaining - 1
          }
        }));
        return true;
      }
    }),
    {
      name: 'making-legends-user-store',
    }
  )
);
