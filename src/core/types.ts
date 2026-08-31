import { PillarId, MissionRank, UserRankId } from '../theme/types';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Mission {
  id: string;
  title: string;
  description?: string;
  pillarId: PillarId;
  rank: MissionRank;
  xpReward: number;
  timeOfDay: TimeOfDay;
  isCompletedToday: boolean;
  completedDates: string[]; // YYYY-MM-DD
  isCustom: boolean;
  order: number;
  createdAt: string;
}

export interface AvatarConfig {
  silhouette: 'shadow' | 'blade' | 'sage' | 'ghost' | 'phoenix';
  outfit: 'tunic_dark' | 'armor_iron' | 'cloak_nomad' | 'wraps_monk';
  headband: 'iron_slate' | 'cloth_crimson' | 'band_gold' | 'mask_shadow';
  auraColor: 'crimson' | 'chakra' | 'jade' | 'gold' | 'violet';
  customEmoji?: string;
}

export interface NotificationSettings {
  morningTime: string;   // Ex: "07:00"
  eveningTime: string;   // Ex: "21:00"
  enabled: boolean;
  soundEnabled: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  gender: 'male' | 'female';
  avatarConfig: AvatarConfig;
  level: number;
  totalXp: number;
  currentRankId: UserRankId;
  pillarXp: Record<PillarId, number>;
  currentProtocolDay: number; // 1 to 66
  currentStreak: number;
  bestStreak: number;
  weeklyShieldsRemaining: number;
  weeklyShieldsMax: number;
  lastActiveDate: string; // YYYY-MM-DD
  isHardModeEnabled: boolean; // Modo Elite
  notificationSettings: NotificationSettings;
  subscriptionStatus: 'trial' | 'active' | 'free';
  hasCompletedOnboarding: boolean;
  unlockedCards: string[];
  equippedItems: string[];
  inventory: string[];
  createdAt: string;
}

export type ItemBuffType = 
  | 'xp_boost_all' 
  | 'xp_boost_pillar' 
  | 'extra_shield' 
  | 'damage_boost';

export interface Item {
  id: string;
  name: string;
  type: 'relic' | 'gear' | 'scroll' | 'elixir';
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  buffType: ItemBuffType;
  buffValue: number; // Ex: 15 para +15% XP
  targetPillar?: PillarId;
  isEquipped?: boolean;
}

export interface Adversary {
  id: string;
  number: number;         // 1 to 30
  name: string;           // 100% original
  title: string;          // Ex: "Ronin Desertor dos Pinheiros"
  level: number;
  maxHp: number;
  currentHp: number;
  pillarWeakness: PillarId;
  lore: string;
  avatarType: string;
  rewardItem: Item;
  isDefeated: boolean;
}

export interface TeachingCard {
  id: string;
  title: string;
  pillarId: PillarId;
  wisdom: string;
  actionTip: string;
  concept: string;
  unlockedDay: number;
  rarity: 'common' | 'rare' | 'legendary';
}

export interface NutritionLog {
  id: string;
  date: string;
  caloriesTarget: number;
  caloriesConsumed: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  meals: {
    name: string;
    calories: number;
    protein: number;
    time: string;
  }[];
}

export interface BodyJournalEntry {
  date: string;
  sleepHours: number;
  sleepQuality: 1 | 2 | 3 | 4 | 5; // 1-5 estrelas
  waterGlasses: number; // Meta: 8-10 copos (250ml cada)
  notes?: string;
}

export interface TrainingLogEntry {
  id: string;
  date: string;
  category: 'forca' | 'resistencia' | 'mobilidade' | 'artes_marciais';
  exerciseName: string;
  sets: number;
  repsOrMinutes: string;
  rpeIntensity: number; // 1-10
}
