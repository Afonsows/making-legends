import { PillarId, MissionRank, UserRankId } from '../theme/types';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Mission {
  id: string;
  title: string;
  description?: string;
  pillarId: PillarId;
  rank: MissionRank;
  xpReward: number;
  ryoReward?: number;
  timeOfDay: TimeOfDay;
  isCompletedToday: boolean;
  completedDates: string[]; // YYYY-MM-DD
  isCustom: boolean;
  order: number;
  createdAt: string;
}

export interface MissionLogEntry {
  id: string;
  missionId: string;
  missionTitle: string;
  pillarId: PillarId;
  rank: MissionRank;
  xp: number;
  ryo: number;
  action: 'completed' | 'reverted' | 'synced';
  createdAt: string; // ISO
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

/**
 * Registro consolidado de um dia de treino.
 * É a fonte da verdade para sequência, presença em desafios e desbloqueio de pergaminhos.
 */
export interface DayRecord {
  date: string;        // YYYY-MM-DD
  xpEarned: number;    // XP base das missões concluídas no dia
  xpTarget: number;    // XP base total das missões do dia
  completed: boolean;  // true = atingiu a meta mínima (50% do XP previsto)
  closed: boolean;     // true = o dia já terminou (a meta fica congelada)
  /** ISO — preenchido quando o shinobi corrige manualmente um dia passado (vence na mesclagem). */
  editedAt?: string;
}

/**
 * Recompensa concedida por uma ação (missão, hábito, ferramenta, presença...).
 * Guardar o valor exato permite estornar sem distorções quando a ação é desfeita.
 */
export interface DamageEntry {
  bossId: string;
  amount: number;       // dano efetivamente aplicado (sem o excedente)
  defeated: boolean;    // este golpe derrotou o adversário
  isCritical: boolean;
  isWeakness: boolean;
}

export interface RewardGrant {
  key: string;
  date: string;          // YYYY-MM-DD em que a recompensa foi concedida
  label: string;
  xp: number;            // XP final aplicado (com bônus)
  ryo: number;           // Ryō final aplicado (com bônus)
  pillarId?: PillarId;
  /** Distribuição por pilar para lançamentos agregados (saldo inicial e resumos de dias antigos). */
  pillarXp?: Partial<Record<PillarId, number>>;
  damage?: DamageEntry[];
  createdAt: string;
}

export interface DailyCheckInRecord {
  dayNumber: number;          // 1 a targetDays
  date: string;               // YYYY-MM-DD
  checked: boolean;           // true = presença confirmada (meta do dia atingida)
  xpEarned: number;           // XP realizado no dia
  targetXp: number;           // XP total previsto do dia
  checkedAt?: string;         // ISO timestamp
}

export interface ProtocolChallengeCycle {
  id: string;
  cycleNumber: number;
  title?: string;
  targetDays?: number;        // Duração da jornada (21, 30, 45, 66, 90...)
  isEliteMode?: boolean;      // Modo Elite fixado no início do desafio
  startDate: string;          // YYYY-MM-DD
  endDate?: string;           // YYYY-MM-DD (data de encerramento real)
  status: 'active' | 'completed' | 'failed';
  currentDay: number;         // 1 a targetDays (0 = ainda não começou)
  daysCompleted: number;      // total de dias com presença
  checkIns: Record<number, DailyCheckInRecord>;
  failedWeek?: number;
  failedReason?: string;
  /** Quem encerrou: a regra de faltas (reavaliável) ou o próprio shinobi (definitivo). */
  endedBy?: 'rule' | 'user';
  /** Dia (local) em que o desafio foi criado — esse dia nunca conta como falta. */
  createdOn?: string;
  /** Dias anteriores a esta data não contam como falta. */
  graceBefore?: string;
  totalXpEarned: number;
  createdAt: string;
  completedAt?: string;
  rewardXp?: number;          // bônus recebido ao concluir
  rewardRyo?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  gender: 'male' | 'female';
  ryo: number; // Moeda Shinobi (両)
  avatarConfig: AvatarConfig;
  level: number;
  totalXp: number;
  currentRankId: UserRankId;
  pillarXp: Record<PillarId, number>;
  currentProtocolDay: number;
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
  activeChallenge?: ProtocolChallengeCycle;
  challengeHistory?: ProtocolChallengeCycle[];
  createdAt: string;

  // ── Motor de progressão v2 ──
  dayLog: Record<string, DayRecord>;           // histórico diário consolidado
  shieldedDates: string[];                     // dias protegidos pelo Escudo de Chakra
  grants: Record<string, RewardGrant>;         // livro-razão: XP, Ryō e nível são DERIVADOS daqui
  revoked: Record<string, string>;             // lançamentos estornados (chave → ISO), para mesclar aparelhos
  deletedMissions: Record<string, string>;     // missões excluídas (id → ISO)
  deletedCycles: Record<string, string>;       // desafios excluídos (id → ISO)
  shieldsThrough?: string;                     // último dia já avaliado para Escudo de Chakra
  dayWipe?: { from: string; at: string };      // dias apagados ao excluir um desafio
  resetEpoch?: string;                         // ISO do último reset completo de progresso
  purchasedItems: string[];                    // relíquias compradas na loja
  extraShieldWeeks: string[];                  // semanas com escudo extra comprado
  soldierPillDates: string[];                  // dias com Pílula de Soldado ativa
  bossesDefeated: number;
  missionsCompletedTotal: number;
  updatedAt?: string;                          // ISO — usado na sincronização
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
  shopPrice?: number; // Itens vendidos na Loja Shinobi
}

export interface Adversary {
  id: string;
  number: number;
  name: string;
  title: string;
  level: number;
  maxHp: number;
  currentHp: number;
  pillarWeakness: PillarId;
  lore: string;
  avatarType: string;
  avatarEmoji?: string;
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
  unlockedDay: number; // Desbloqueia ao atingir N "Dias Cumpridos" na jornada
  rarity: 'common' | 'rare' | 'legendary';
  kanji?: string;
  sealName?: string;
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
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  waterGlasses: number;
  notes?: string;
  sleepLogged?: boolean;
}

export interface TrainingLogEntry {
  id: string;
  date: string;
  category: 'forca' | 'resistencia' | 'mobilidade' | 'artes_marciais';
  exerciseName: string;
  sets: number;
  repsOrMinutes: string;
  rpeIntensity: number;
}

export interface ChallengeHabit {
  id: string;
  title: string;
  description?: string;
  pillarId?: PillarId;
  color?: string;
  completedDates: string[];
  createdAt: string;
}

export interface UserChallenge {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  targetDays: number; // Mínimo 21 dias
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  isOfficial66?: boolean;
  habits: ChallengeHabit[];
  createdAt: string;
  completedAt?: string;
}
