import { Adversary, Item, DamageEntry } from './types';
import { PillarId } from '../theme/types';
import { originalAdversaries } from './adversariesData';
import { STARTER_ITEMS } from './itemsData';

export const WEAKNESS_BONUS_PCT = 35;
export const CRITICAL_CHANCE = 0.15;
export const CRITICAL_MULTIPLIER = 1.5;

export interface DamageCalculationResult {
  baseDamage: number;
  weaknessBonus: number;
  gearBonus: number;
  totalDamage: number;
  isCritical: boolean;
  isWeakness: boolean;
  message: string;
}

/**
 * Converte o XP de uma missão em dano contra o adversário ativo.
 * `random` é injetável para testes determinísticos.
 */
export function calculateDuelDamage(
  missionXp: number,
  missionPillar: PillarId,
  adversary: Adversary,
  equippedItems: Item[],
  random: () => number = Math.random
): DamageCalculationResult {
  const baseDamage = Math.max(0, Math.round(missionXp));
  const isWeakness = missionPillar === adversary.pillarWeakness;
  const weaknessBonus = isWeakness ? Math.round((baseDamage * WEAKNESS_BONUS_PCT) / 100) : 0;

  const gearPct = equippedItems
    .filter((i) => i.buffType === 'damage_boost')
    .reduce((acc, i) => acc + i.buffValue, 0);
  const gearBonus = Math.round((baseDamage * gearPct) / 100);

  const isCritical = random() < CRITICAL_CHANCE;
  const totalDamage = Math.round((baseDamage + weaknessBonus + gearBonus) * (isCritical ? CRITICAL_MULTIPLIER : 1));

  let message = `Golpe certeiro! ${totalDamage} de dano.`;
  if (isWeakness) message = `Ponto fraco atingido! +${weaknessBonus} de dano extra.`;
  if (isCritical) message = `GOLPE CRÍTICO! ${totalDamage} de dano devastador!`;

  return { baseDamage, weaknessBonus, gearBonus, totalDamage, isCritical, isWeakness, message };
}

export function getAdversaryByIndex(index: number): Adversary {
  const safeIndex = Math.min(originalAdversaries.length - 1, Math.max(0, index));
  return originalAdversaries[safeIndex];
}

/** Índice do primeiro adversário ainda não derrotado (o alvo real dos golpes). */
export function getActiveTargetIndex(adversaries: Adversary[]): number {
  const idx = adversaries.findIndex((a) => !a.isDefeated);
  return idx === -1 ? adversaries.length - 1 : idx;
}

export function applyDamageToAdversary(
  adversary: Adversary,
  damage: number
): { updatedAdversary: Adversary; isDefeatedNow: boolean; appliedDamage: number } {
  const appliedDamage = Math.min(adversary.currentHp, Math.max(0, damage));
  const newHp = adversary.currentHp - appliedDamage;
  const isDefeatedNow = newHp === 0 && !adversary.isDefeated;
  return {
    updatedAdversary: { ...adversary, currentHp: newHp, isDefeated: newHp === 0 },
    isDefeatedNow,
    appliedDamage,
  };
}

/** Desfaz exatamente o dano registrado (missão desmarcada). */
export function revertDamageEntries(adversaries: Adversary[], entries: DamageEntry[] = []): Adversary[] {
  if (!entries.length) return adversaries;
  return adversaries.map((adv) => {
    const healed = entries.filter((e) => e.bossId === adv.id).reduce((acc, e) => acc + e.amount, 0);
    if (healed <= 0) return adv;
    const currentHp = Math.min(adv.maxHp, adv.currentHp + healed);
    return { ...adv, currentHp, isDefeated: currentHp === 0 };
  });
}

/**
 * Inventário derivado: itens iniciais + relíquias dos chefes derrotados + compras na loja.
 * Assim um item nunca "some" nem aparece sem motivo.
 */
export function deriveInventory(adversaries: Adversary[], purchasedItems: string[] = []): string[] {
  const set = new Set<string>(STARTER_ITEMS);
  adversaries.forEach((a) => a.isDefeated && a.rewardItem?.id && set.add(a.rewardItem.id));
  purchasedItems.forEach((id) => set.add(id));
  return Array.from(set);
}

/** Recompensa em Ryō e XP por derrotar um adversário. */
export function getBossVictoryReward(adversary: Adversary): { xp: number; ryo: number } {
  return { xp: 0, ryo: 50 + adversary.level * 20 };
}

/** Ryō pago pelo ferreiro quando a relíquia do chefe já está na mochila. */
export function getDuplicateRelicRyo(adversary: Adversary): number {
  return 100 + adversary.level * 15;
}
