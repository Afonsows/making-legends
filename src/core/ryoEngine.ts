import { MissionRank, UserRankId, PillarId } from '../theme/types';
import { Item } from './types';
import { getRankIdFromLevel } from './xpEngine';

/**
 * Recompensa base de Ryō por rank de missão (proporcional ao esforço):
 * E 15 · D 35 · C 70 · B 130 · A 220 · S 400
 */
export function getDefaultRyoReward(rank: MissionRank): number {
  switch (rank) {
    case 'E': return 15;
    case 'D': return 35;
    case 'C': return 70;
    case 'B': return 130;
    case 'A': return 220;
    case 'S': return 400;
    default: return 35;
  }
}

/** Bônus de Ryō pela sequência de dias cumpridos (em fração: 0.10 = +10%). */
export function getStreakRyoMultiplier(streak: number): number {
  if (streak >= 66) return 0.66;
  if (streak >= 45) return 0.45;
  if (streak >= 30) return 0.35;
  if (streak >= 21) return 0.25;
  if (streak >= 14) return 0.20;
  if (streak >= 7) return 0.10;
  if (streak >= 3) return 0.05;
  return 0;
}

/** Bônus de Ryō pelo prestígio (patente) do shinobi. */
export function getRankRyoMultiplier(level: number): number {
  const rankId: UserRankId = getRankIdFromLevel(level);
  switch (rankId) {
    case 'kage': return 0.35;
    case 'sannin': return 0.25;
    case 'anbu': return 0.20;
    case 'jonin': return 0.15;
    case 'chunin': return 0.10;
    case 'genin': return 0.05;
    default: return 0;
  }
}

/** Estipêndio diário de Ryō ao cumprir a meta do dia (Dia Cumprido). */
export function getDailyCheckInRyoBonus(streak: number, level: number): number {
  const base = 40;
  return base + Math.floor(base * getStreakRyoMultiplier(streak)) + Math.floor(base * getRankRyoMultiplier(level));
}

/** Ryō recebido ao alcançar um novo nível. */
export function getLevelUpRyoReward(newLevel: number): number {
  return 50 + newLevel * 10;
}

/** Soma do Ryō de promoção entre dois níveis (exclusivo `from`, inclusivo `to`). */
export function getLevelUpRyoBetween(fromLevel: number, toLevel: number): number {
  let total = 0;
  for (let lvl = fromLevel + 1; lvl <= toLevel; lvl++) total += getLevelUpRyoReward(lvl);
  return total;
}

/**
 * Calcula o ganho final de Ryō com bônus de sequência, patente e relíquias.
 * Relíquias de XP rendem metade do seu bônus em Ryō.
 */
export function calculateRyoGainWithBuffs(
  baseRyo: number,
  streak: number = 0,
  level: number = 1,
  equippedItems: Item[] = [],
  pillarId?: PillarId
): {
  finalRyo: number;
  bonusRyo: number;
  streakBonusPct: number;
  rankBonusPct: number;
  appliedBuffs: string[];
} {
  const streakBonusPct = Math.round(getStreakRyoMultiplier(streak) * 100);
  const rankBonusPct = Math.round(getRankRyoMultiplier(level) * 100);
  const appliedBuffs: string[] = [];

  let itemPct = 0;
  equippedItems.forEach((item) => {
    const appliesToPillar = item.buffType === 'xp_boost_pillar' && pillarId && item.targetPillar === pillarId;
    if (item.buffType === 'xp_boost_all' || appliesToPillar) {
      const pct = item.buffValue * 0.5;
      itemPct += pct;
      appliedBuffs.push(`${item.name} (+${Math.round(pct)}% Ryō)`);
    }
  });

  if (streakBonusPct > 0) appliedBuffs.push(`Sequência de ${streak} dias (+${streakBonusPct}%)`);
  if (rankBonusPct > 0) appliedBuffs.push(`Prestígio da patente (+${rankBonusPct}%)`);

  const totalMultiplier = 1 + (streakBonusPct + rankBonusPct + itemPct) / 100;
  const finalRyo = baseRyo > 0 ? Math.max(1, Math.round(baseRyo * totalMultiplier)) : 0;

  return {
    finalRyo,
    bonusRyo: Math.max(0, finalRyo - baseRyo),
    streakBonusPct,
    rankBonusPct,
    appliedBuffs,
  };
}
