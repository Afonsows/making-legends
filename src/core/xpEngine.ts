import { UserRankId, PillarId } from '../theme/types';
import { Item } from './types';

/**
 * Calcula a quantidade de XP total necessária para atingir determinado nível.
 * Curva não-linear: rápida no começo (tração imediata) e íngreme a partir do nível 22 (Jonin).
 */
export function getRequiredXpForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let accumulated = 0;
  for (let lvl = 1; lvl < level; lvl++) {
    if (lvl < 5) {
      // Nível 1 a 4 (Aspirante): Rápido e recompensador (~100-160 XP por nível)
      accumulated += Math.floor(100 * Math.pow(lvl, 1.15));
    } else if (lvl < 12) {
      // Nível 5 a 11 (Genin): Tração de hábito (~200-350 XP por nível)
      accumulated += Math.floor(130 * Math.pow(lvl, 1.25));
    } else if (lvl < 22) {
      // Nível 12 a 21 (Chunin): Foco e consistência (~450-800 XP por nível)
      accumulated += Math.floor(160 * Math.pow(lvl, 1.35));
    } else if (lvl < 35) {
      // Nível 22 a 34 (Jonin): Exigência real (~1000-1800 XP por nível)
      accumulated += Math.floor(210 * Math.pow(lvl, 1.48));
    } else if (lvl < 50) {
      // Nível 35 a 49 (Anbu): Disciplina implacável (~2200-3600 XP por nível)
      accumulated += Math.floor(270 * Math.pow(lvl, 1.55));
    } else {
      // Nível 50 a 66 (Sannin / Kage): Maestria Suprema (~4000-7000 XP por nível)
      accumulated += Math.floor(340 * Math.pow(lvl, 1.62));
    }
  }
  return accumulated;
}

/**
 * Retorna o nível correspondente ao XP acumulado total.
 */
export function getLevelFromTotalXp(totalXp: number): number {
  let level = 1;
  while (totalXp >= getRequiredXpForLevel(level + 1)) {
    level++;
    if (level >= 100) break; // Limite de segurança
  }
  return level;
}

/**
 * Retorna o rank shinobi baseado no nível atual.
 */
export function getRankIdFromLevel(level: number): UserRankId {
  if (level >= 66) return 'kage';
  if (level >= 50) return 'sannin';
  if (level >= 35) return 'anbu';
  if (level >= 22) return 'jonin';
  if (level >= 12) return 'chunin';
  if (level >= 5) return 'genin';
  return 'aspirante';
}

/**
 * Calcula o progresso percentual dentro do nível atual.
 */
export function getLevelProgress(totalXp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXpThreshold: number;
  progressPercent: number;
} {
  const currentLevel = getLevelFromTotalXp(totalXp);
  const currentFloorXp = getRequiredXpForLevel(currentLevel);
  const nextCeilingXp = getRequiredXpForLevel(currentLevel + 1);
  
  const currentLevelXp = totalXp - currentFloorXp;
  const xpNeededForThisLevel = nextCeilingXp - currentFloorXp;
  
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.floor((currentLevelXp / Math.max(1, xpNeededForThisLevel)) * 100))
  );

  return {
    currentLevel,
    currentLevelXp,
    nextLevelXpThreshold: xpNeededForThisLevel,
    progressPercent,
  };
}

/**
 * Aplica os buffs de equipamentos e relíquias funcionais ao ganho de XP.
 */
export function calculateXpGainWithBuffs(
  baseXp: number,
  pillarId: PillarId,
  equippedItems: Item[]
): { finalXp: number; bonusXp: number; appliedBuffs: string[] } {
  let multiplier = 1.0;
  const appliedBuffs: string[] = [];

  for (const item of equippedItems) {
    if (item.buffType === 'xp_boost_all') {
      multiplier += item.buffValue / 100;
      appliedBuffs.push(`${item.name} (+${item.buffValue}% Geral)`);
    } else if (item.buffType === 'xp_boost_pillar' && item.targetPillar === pillarId) {
      multiplier += item.buffValue / 100;
      appliedBuffs.push(`${item.name} (+${item.buffValue}% ${pillarId.toUpperCase()})`);
    }
  }

  const finalXp = Math.round(baseXp * multiplier);
  const bonusXp = Math.max(0, finalXp - baseXp);

  return {
    finalXp,
    bonusXp,
    appliedBuffs,
  };
}
