import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Adversary, Item, DamageEntry } from '../core/types';
import { PillarId } from '../theme/types';
import { originalAdversaries } from '../core/adversariesData';
import {
  calculateDuelDamage,
  applyDamageToAdversary,
  revertDamageEntries,
  getActiveTargetIndex,
  deriveInventory,
  getBossVictoryReward,
  getDuplicateRelicRyo,
} from '../core/duelEngine';
import { useUserStore } from './useUserStore';
import { soundFx } from '../utils/audio';
import { triggerBossDefeatedConfetti } from '../utils/confetti';

export interface CombatLogEntry {
  id: string;
  damage: number;
  message: string;
  isCritical: boolean;
  isWeakness: boolean;
  timestamp: string;
  reverted?: boolean;
}

export interface DuelStoreState {
  adversaries: Adversary[];
  currentAdversaryIndex: number; // adversário em exibição na Arena
  combatLogs: CombatLogEntry[];
  activeVictoryModal: { defeatedBoss: Adversary; rewardItem: Item; ryoReward: number; isDuplicate?: boolean } | null;
  lastDamageDealt: { amount: number; isCritical: boolean; id: string } | null;

  isAdversaryUnlocked: (index: number) => boolean;
  reconcileAdversaries: () => void;
  getCurrentAdversary: () => Adversary;
  getTargetAdversary: () => Adversary;
  getDerivedInventory: (purchasedItems: string[]) => string[];
  strike: (xpAmount: number, pillarId: PillarId, equippedItems: Item[]) => DamageEntry[];
  revertStrike: (entries: DamageEntry[]) => string[];
  dealDamageFromMission: (xpAmount: number, pillarId: PillarId, equippedItems: Item[]) => void;
  selectAdversary: (index: number) => void;
  closeVictoryModal: () => void;
  claimVictoryReward: (equip?: boolean) => void;
  resetAdversariesProgress: () => void;
}

/** Garante a lista completa de 30 adversários com dados atuais (HP, nomes) e progresso salvo. */
function normalizeAdversaries(saved: Adversary[] | undefined): Adversary[] {
  const byId = new Map((saved || []).map((a) => [a.id, a]));
  let list = originalAdversaries.map((base) => {
    const prev = byId.get(base.id);
    if (!prev) return { ...base };
    const isDefeated = Boolean(prev.isDefeated);
    // Preserva a proporção de vida perdida mesmo se o HP máximo foi rebalanceado
    const lostRatio = prev.maxHp > 0 ? 1 - Math.max(0, Math.min(prev.currentHp, prev.maxHp)) / prev.maxHp : 0;
    const currentHp = isDefeated ? 0 : Math.max(1, Math.round(base.maxHp * (1 - lostRatio)));
    return { ...base, currentHp, isDefeated };
  });

  // Progressão linear: se o chefe N foi derrotado, todos os anteriores também foram.
  let lastDefeated = -1;
  list.forEach((a, i) => a.isDefeated && (lastDefeated = i));
  list = list.map((a, i) => (i <= lastDefeated ? { ...a, currentHp: 0, isDefeated: true } : a));
  return list;
}

const logTime = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const useDuelStore = create<DuelStoreState>()(
  persist(
    (set, get) => ({
      adversaries: normalizeAdversaries(undefined),
      currentAdversaryIndex: 0,
      combatLogs: [],
      activeVictoryModal: null,
      lastDamageDealt: null,

      isAdversaryUnlocked: (index) => {
        if (index <= 0) return true;
        return get().adversaries[index - 1]?.isDefeated === true;
      },

      reconcileAdversaries: () => {
        const adversaries = normalizeAdversaries(get().adversaries);
        set({ adversaries, currentAdversaryIndex: getActiveTargetIndex(adversaries) });
      },

      getCurrentAdversary: () => {
        const { adversaries, currentAdversaryIndex } = get();
        return adversaries[currentAdversaryIndex] || adversaries[0];
      },

      getTargetAdversary: () => {
        const { adversaries } = get();
        return adversaries[getActiveTargetIndex(adversaries)];
      },

      getDerivedInventory: (purchasedItems) => deriveInventory(get().adversaries, purchasedItems),

      /** Golpeia o primeiro adversário ainda de pé e devolve o registro exato do dano. */
      strike: (xpAmount, pillarId, equippedItems) => {
        const { adversaries } = get();
        const targetIndex = getActiveTargetIndex(adversaries);
        const target = adversaries[targetIndex];
        if (!target || target.isDefeated) return [];

        const calc = calculateDuelDamage(xpAmount, pillarId, target, equippedItems);
        const { updatedAdversary, isDefeatedNow, appliedDamage } = applyDamageToAdversary(target, calc.totalDamage);

        const log: CombatLogEntry = {
          id: `hit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          damage: calc.totalDamage,
          message: calc.message,
          isCritical: calc.isCritical,
          isWeakness: calc.isWeakness,
          timestamp: logTime(),
        };

        const updatedList = adversaries.map((b, i) => (i === targetIndex ? updatedAdversary : b));
        set({
          adversaries: updatedList,
          combatLogs: [log, ...get().combatLogs].slice(0, 20),
          lastDamageDealt: { amount: calc.totalDamage, isCritical: calc.isCritical, id: log.id },
          currentAdversaryIndex: targetIndex,
        });

        if (calc.isCritical) soundFx.playCriticalHit();
        else soundFx.playBossHit();

        if (isDefeatedNow) {
          const reward = getBossVictoryReward(updatedAdversary);
          const userStore = useUserStore.getState();
          // Relíquia repetida vira Ryō extra (o ferreiro compra a peça duplicada)
          const isDuplicate = userStore.profile.inventory.includes(updatedAdversary.rewardItem.id);
          const duplicateRyo = isDuplicate ? getDuplicateRelicRyo(updatedAdversary) : 0;
          userStore.grantReward({
            key: `boss:${updatedAdversary.id}`,
            label: `Vitória sobre ${updatedAdversary.name}`,
            baseXp: reward.xp,
            baseRyo: reward.ryo + duplicateRyo,
            applyXpBuffs: false,
            applyRyoBuffs: false,
          });
          userStore.syncInventory();
          setTimeout(() => {
            soundFx.playBossDefeated();
            triggerBossDefeatedConfetti();
          }, 250);
          set({
            activeVictoryModal: {
              defeatedBoss: updatedAdversary,
              rewardItem: updatedAdversary.rewardItem,
              ryoReward: reward.ryo + duplicateRyo,
              isDuplicate,
            },
          });
        }

        return [
          {
            bossId: target.id,
            amount: appliedDamage,
            defeated: isDefeatedNow,
            isCritical: calc.isCritical,
            isWeakness: calc.isWeakness,
          },
        ];
      },

      /** Desfaz o dano (missão desmarcada). Devolve os IDs de chefes que voltaram à luta. */
      revertStrike: (entries) => {
        const before = get().adversaries;
        const after = revertDamageEntries(before, entries);
        const revived = before.filter((b, i) => b.isDefeated && !after[i].isDefeated).map((b) => b.id);
        const total = entries.reduce((acc, e) => acc + e.amount, 0);

        set({
          adversaries: after,
          currentAdversaryIndex: getActiveTargetIndex(after),
          lastDamageDealt: null,
          activeVictoryModal: revived.includes(get().activeVictoryModal?.defeatedBoss.id || '') ? null : get().activeVictoryModal,
          combatLogs: [
            {
              id: `undo_${Date.now()}`,
              damage: -total,
              message: 'Missão desfeita — o adversário recuperou a resistência.',
              isCritical: false,
              isWeakness: false,
              timestamp: logTime(),
              reverted: true,
            },
            ...get().combatLogs,
          ].slice(0, 20),
        });

        if (revived.length) useUserStore.getState().syncInventory();
        return revived;
      },

      dealDamageFromMission: (xpAmount, pillarId, equippedItems) => {
        get().strike(xpAmount, pillarId, equippedItems);
      },

      selectAdversary: (index) => {
        const safe = Math.min(get().adversaries.length - 1, Math.max(0, index));
        if (get().isAdversaryUnlocked(safe)) set({ currentAdversaryIndex: safe });
      },

      closeVictoryModal: () => set({ activeVictoryModal: null }),

      claimVictoryReward: (equip = true) => {
        const modal = get().activeVictoryModal;
        if (modal && equip) useUserStore.getState().equipItem(modal.rewardItem.id);
        set({
          activeVictoryModal: null,
          currentAdversaryIndex: getActiveTargetIndex(get().adversaries),
        });
      },

      resetAdversariesProgress: () => {
        set({
          adversaries: normalizeAdversaries(undefined),
          currentAdversaryIndex: 0,
          combatLogs: [],
          activeVictoryModal: null,
        });
        useUserStore.getState().syncInventory();
      },
    }),
    {
      name: 'making-legends-duel-store',
      version: 2,
      partialize: (state) =>
        ({
          adversaries: state.adversaries,
          currentAdversaryIndex: state.currentAdversaryIndex,
          combatLogs: state.combatLogs,
        }) as unknown as DuelStoreState,
      migrate: (persisted) => persisted as DuelStoreState,
      merge: (persisted, current) => {
        const saved = (persisted || {}) as Partial<DuelStoreState>;
        const adversaries = normalizeAdversaries(saved.adversaries);
        return {
          ...current,
          adversaries,
          combatLogs: Array.isArray(saved.combatLogs) ? saved.combatLogs : [],
          currentAdversaryIndex: getActiveTargetIndex(adversaries),
        };
      },
    }
  )
);
