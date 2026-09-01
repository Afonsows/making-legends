import { MissionRank, UserRankId } from '../theme/types';
import { Item } from './types';
import { getRankIdFromLevel } from './xpEngine';

/**
 * Retorna a recompensa base de Ryo para cada rank de missao.
 * Escalonamento proporcional ao esforco, complexidade e recompensa de XP:
 * - Rank E (Basico, <5 min): 15 Ryo (base XP: 25)
 * - Rank D (Regular, 10-20 min): 35 Ryo (base XP: 50)
 * - Rank C (Focado, 30-45 min): 70 Ryo (base XP: 85)
 * - Rank B (Avancado, 45-90 min): 130 Ryo (base XP: 140)
 * - Rank A (Mestre, 2h+): 220 Ryo (base XP: 220)
 * - Rank S (Lendario, Desafio Maximo): 400 Ryo (base XP: 350)
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

/**
 * Multiplicador de Ryo baseado na sequencia (streak) de consistencia diaria.
 */
export function getStreakRyoMultiplier(streak: number): number {
  if (streak >= 66) return 0.66; // +66% para Lenda Kage
  if (streak >= 45) return 0.45; // +45% (Fase 3 - Mestria)
  if (streak >= 30) return 0.35; // +35%
  if (streak >= 21) return 0.25; // +25% (Fase 2 - Forja)
  if (streak >= 14) return 0.20; // +20%
  if (streak >= 7)  return 0.10; // +10% (1 semana completa)
  if (streak >= 3)  return 0.05; // +5%
  return 0;
}

/**
 * Multiplicador de Ryo baseado no rank/prestigio do shinobi.
 */
export function getRankRyoMultiplier(level: number): number {
  const rankId: UserRankId = getRankIdFromLevel(level);
  switch (rankId) {
    case 'kage':     return 0.35; // +35%
    case 'sannin':   return 0.25; // +25%
    case 'anbu':     return 0.20; // +20%
    case 'jonin':    return 0.15; // +15%
    case 'chunin':   return 0.10; // +10%
    case 'genin':    return 0.05; // +5%
    case 'aspirante':
    default:
      return 0;
  }
}

/**
 * Bonus de estipendio diario de Ryo pelo Check-in diario de presenca.
 */
export function getDailyCheckInRyoBonus(streak: number, level: number): number {
  const baseCheckInRyo = 40;
  const streakBonus = Math.floor(baseCheckInRyo * getStreakRyoMultiplier(streak));
  const rankBonus = Math.floor(baseCheckInRyo * getRankRyoMultiplier(level));
  return baseCheckInRyo + streakBonus + rankBonus;
}

/**
 * Recompensa em Ryo concedida ao subir de nivel (promocao de Chakra).
 */
export function getLevelUpRyoReward(newLevel: number): number {
  return 50 + (newLevel * 10);
}

/**
 * Calcula o ganho final de Ryo aplicando multiplicadores de streak, nivel e itens equipados.
 */
export function calculateRyoGainWithBuffs(
  baseRyo: number,
  streak: number = 0,
  level: number = 1,
  equippedItems: Item[] = []
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

  let itemMultiplier = 0;
  equippedItems.forEach((item) => {
    if (item.buffType === 'xp_boost_pillar') {
      itemMultiplier += (item.buffValue * 0.5) / 100;
      appliedBuffs.push(`${item.name} (+${Math.round(item.buffValue * 0.5)}% Ryō)`);
    }
  });

  if (streakBonusPct > 0) {
    appliedBuffs.push(`Consistência (${streak} dias: +${streakBonusPct}%)`);
  }
  if (rankBonusPct > 0) {
    appliedBuffs.push(`Prestígio Ninja (+${rankBonusPct}%)`);
  }

  const totalMultiplier = 1.0 + (streakBonusPct / 100) + (rankBonusPct / 100) + itemMultiplier;
  const finalRyo = Math.max(1, Math.round(baseRyo * totalMultiplier));
  const bonusRyo = finalRyo - baseRyo;

  return {
    finalRyo,
    bonusRyo,
    streakBonusPct,
    rankBonusPct,
    appliedBuffs,
  };
}
