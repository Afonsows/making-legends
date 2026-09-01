export type PillarId = 'taijutsu' | 'ninjutsu' | 'chakra' | 'espirito' | 'genjutsu';

export type UserRankId = 
  | 'aspirante'
  | 'genin'
  | 'chunin'
  | 'jonin'
  | 'anbu'
  | 'sannin'
  | 'kage';

export type MissionRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface ThemePillarConfig {
  id: PillarId;
  name: string;             // Ex: "Taijutsu"
  categoryLabel: string;    // Ex: "Corpo"
  description: string;      // Ex: "Treino físico, postura, atividade"
  color: string;            // Hex / Tailwind color
  iconName: string;         // Nome do ícone
  badgeIcon: string;
}

export interface ThemeRankConfig {
  id: UserRankId;
  name: string;             // Ex: "Genin"
  minLevel: number;         // Nível inicial para esse rank
  description: string;      // Descrição de lore
  badge: string;            // Insígnia/Emoji representativo
  titleColor: string;       // Cor de destaque do rank
}

export interface ThemeMissionRankConfig {
  rank: MissionRank;
  label: string;            // Ex: "Rank E - Básico"
  xpReward: number;         // XP base
  ryoReward: number;        // Ryō base
  recommendedTime: string;  // Ex: "< 5 min"
  color: string;
  borderColor: string;
}

export interface ThemeProtocolPhaseConfig {
  phaseIndex: 1 | 2 | 3;
  name: string;             // Ex: "Despertar"
  daysRange: string;        // Ex: "Dias 1–22"
  tagline: string;          // Ex: "Desconstrução de velhos padrões e despertar da disciplina"
  quote: string;
  focus: string;
}

export interface ThemeVocabulary {
  appName: string;
  statusWindow: string;     // Ex: "Pergaminho de Status"
  missionScroll: string;    // Ex: "Pergaminho de Missão"
  duelMode: string;         // Ex: "Modo Duelo"
  hardMode: string;         // Ex: "Modo Elite / Treino Extremo"
  dailyCards: string;       // Ex: "Pergaminhos de Ensinamento"
  streakUnit: string;       // Ex: "Dias de Treino"
  shieldName: string;       // Ex: "Escudo de Chakra"
  villageHub: string;       // Ex: "Vila Shinobi"
  levelUpMessage: string;
  duelVictoryMessage: string;
}

export interface ThemeConfig {
  id: string;
  displayName: string;
  vocabulary: ThemeVocabulary;
  pillars: Record<PillarId, ThemePillarConfig>;
  ranks: Record<UserRankId, ThemeRankConfig>;
  missionRanks: Record<MissionRank, ThemeMissionRankConfig>;
  protocolPhases: Record<1 | 2 | 3, ThemeProtocolPhaseConfig>;
  adversariesCount: number;
}
