import { UserRankId, PillarId } from '../theme/types';
import { Item } from './types';

export const MAX_LEVEL = 100;

/**
 * Custo em XP para sair do nível `level` e chegar ao próximo.
 * Curva suave e contínua (sem saltos entre faixas):
 *  - Nível 2 já no 1º dia de treino completo
 *  - Genin (Nv 5) em ~5 dias · Chunin (Nv 12) em ~3 semanas
 *  - Jonin (Nv 22) ao final de um desafio de 66 dias bem feito
 *  - Anbu (Nv 35) ~5 meses · Sannin (Nv 50) ~9 meses · Kage (Nv 66) ~1 ano+
 */
export function getXpCostForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.round((220 * Math.pow(level, 0.75)) / 5) * 5;
}

const cumulativeTable: number[] = (() => {
  const table = [0, 0]; // índice = nível; nível 1 começa em 0 XP
  for (let lvl = 2; lvl <= MAX_LEVEL + 1; lvl++) {
    table[lvl] = table[lvl - 1] + getXpCostForLevel(lvl - 1);
  }
  return table;
})();

/** XP total acumulado necessário para ATINGIR o nível informado. */
export function getRequiredXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return cumulativeTable[Math.min(level, MAX_LEVEL + 1)];
}

export function getLevelFromTotalXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  while (level < MAX_LEVEL && xp >= getRequiredXpForLevel(level + 1)) level++;
  return level;
}

export const RANK_MIN_LEVELS: Record<UserRankId, number> = {
  aspirante: 1,
  genin: 5,
  chunin: 12,
  jonin: 22,
  anbu: 35,
  sannin: 50,
  kage: 66,
};

export function getRankIdFromLevel(level: number): UserRankId {
  if (level >= RANK_MIN_LEVELS.kage) return 'kage';
  if (level >= RANK_MIN_LEVELS.sannin) return 'sannin';
  if (level >= RANK_MIN_LEVELS.anbu) return 'anbu';
  if (level >= RANK_MIN_LEVELS.jonin) return 'jonin';
  if (level >= RANK_MIN_LEVELS.chunin) return 'chunin';
  if (level >= RANK_MIN_LEVELS.genin) return 'genin';
  return 'aspirante';
}

export function getLevelProgress(totalXp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXpThreshold: number;
  progressPercent: number;
} {
  const currentLevel = getLevelFromTotalXp(totalXp);
  const floor = getRequiredXpForLevel(currentLevel);
  const ceiling = getRequiredXpForLevel(currentLevel + 1);
  const currentLevelXp = Math.max(0, Math.floor(totalXp) - floor);
  const needed = Math.max(1, ceiling - floor);
  return {
    currentLevel,
    currentLevelXp,
    nextLevelXpThreshold: needed,
    progressPercent: Math.min(100, Math.max(0, Math.floor((currentLevelXp / needed) * 100))),
  };
}

export const ELITE_XP_BONUS_PCT = 20;
export const SOLDIER_PILL_XP_BONUS_PCT = 25;

export interface XpBuffContext {
  isEliteMode?: boolean;
  soldierPillActive?: boolean;
}

/**
 * Aplica relíquias equipadas, Modo Elite e Pílula de Soldado ao ganho de XP.
 * Os bônus são somados (aditivos), nunca multiplicados entre si.
 */
export function calculateXpGainWithBuffs(
  baseXp: number,
  pillarId: PillarId,
  equippedItems: Item[],
  context: XpBuffContext = {}
): { finalXp: number; bonusXp: number; appliedBuffs: string[] } {
  let bonusPct = 0;
  const appliedBuffs: string[] = [];

  for (const item of equippedItems) {
    if (item.buffType === 'xp_boost_all') {
      bonusPct += item.buffValue;
      appliedBuffs.push(`${item.name} (+${item.buffValue}% geral)`);
    } else if (item.buffType === 'xp_boost_pillar' && item.targetPillar === pillarId) {
      bonusPct += item.buffValue;
      appliedBuffs.push(`${item.name} (+${item.buffValue}%)`);
    }
  }
  if (context.isEliteMode) {
    bonusPct += ELITE_XP_BONUS_PCT;
    appliedBuffs.push(`Modo Elite (+${ELITE_XP_BONUS_PCT}%)`);
  }
  if (context.soldierPillActive) {
    bonusPct += SOLDIER_PILL_XP_BONUS_PCT;
    appliedBuffs.push(`Pílula de Soldado (+${SOLDIER_PILL_XP_BONUS_PCT}%)`);
  }

  const finalXp = Math.max(0, Math.round(baseXp * (1 + bonusPct / 100)));
  return { finalXp, bonusXp: Math.max(0, finalXp - baseXp), appliedBuffs };
}
