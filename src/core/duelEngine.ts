import { Adversary, Item } from './types';
import { PillarId } from '../theme/types';
import { originalAdversaries } from './adversariesData';

export interface DamageCalculationResult {
  baseDamage: number;
  weaknessBonus: number;
  gearBonus: number;
  totalDamage: number;
  isCritical: boolean;
  message: string;
}

/**
 * Calcula o dano causado ao adversário ativo ao completar uma missão.
 */
export function calculateDuelDamage(
  missionXp: number,
  missionPillar: PillarId,
  adversary: Adversary,
  equippedItems: Item[]
): DamageCalculationResult {
  const baseDamage = missionXp;
  
  // Bônus se o pilar da missão atinge a fraqueza do Boss
  const isWeaknessHit = missionPillar === adversary.pillarWeakness;
  const weaknessMultiplier = isWeaknessHit ? 0.35 : 0; // +35% de dano
  const weaknessBonus = Math.round(baseDamage * weaknessMultiplier);

  // Bônus de equipamentos equipados (ex: Lâminas Gêmeas)
  let gearMultiplier = 0;
  for (const item of equippedItems) {
    if (item.buffType === 'damage_boost') {
      gearMultiplier += item.buffValue / 100;
    }
  }
  const gearBonus = Math.round(baseDamage * gearMultiplier);

  const isCritical = Math.random() < 0.15; // 15% de chance de crítico temático
  const critMultiplier = isCritical ? 1.5 : 1.0;

  const totalDamage = Math.round((baseDamage + weaknessBonus + gearBonus) * critMultiplier);

  let message = `Golpe certeiro! Causou ${totalDamage} de dano.`;
  if (isWeaknessHit) {
    message = `🔥 VULNERABILIDADE EXPLORADA! +${weaknessBonus} de dano por foco em ${missionPillar.toUpperCase()}!`;
  }
  if (isCritical) {
    message = `⚡ GOLPE CRÍTICO SHINOBI! ${totalDamage} de dano massivo!`;
  }

  return {
    baseDamage,
    weaknessBonus,
    gearBonus,
    totalDamage,
    isCritical,
    message,
  };
}

/**
 * Retorna o adversário ativo baseado no índice ou ID.
 */
export function getAdversaryByIndex(index: number): Adversary {
  const safeIndex = Math.min(originalAdversaries.length - 1, Math.max(0, index));
  return originalAdversaries[safeIndex];
}

/**
 * Aplica o dano ao adversário e verifica vitória.
 */
export function applyDamageToAdversary(
  adversary: Adversary,
  damage: number
): { updatedAdversary: Adversary; isDefeatedNow: boolean } {
  const newHp = Math.max(0, adversary.currentHp - damage);
  const isDefeatedNow = newHp === 0 && !adversary.isDefeated;

  return {
    updatedAdversary: {
      ...adversary,
      currentHp: newHp,
      isDefeated: newHp === 0,
    },
    isDefeatedNow,
  };
}
