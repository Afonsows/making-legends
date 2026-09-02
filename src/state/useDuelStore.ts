import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Adversary, Item } from '../core/types';
import { PillarId } from '../theme/types';
import { originalAdversaries } from '../core/adversariesData';
import { calculateDuelDamage, applyDamageToAdversary } from '../core/duelEngine';
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
}

export interface DuelStoreState {
  adversaries: Adversary[];
  currentAdversaryIndex: number;
  combatLogs: CombatLogEntry[];
  activeVictoryModal: { defeatedBoss: Adversary; rewardItem: Item } | null;
  lastDamageDealt: { amount: number; isCritical: boolean; id: string } | null;

  // Actions
  isAdversaryUnlocked: (index: number) => boolean;
  reconcileAdversaries: () => void;
  getCurrentAdversary: () => Adversary;
  dealDamageFromMission: (xpAmount: number, pillarId: PillarId, equippedItems: Item[]) => void;
  selectAdversary: (index: number) => void;
  closeVictoryModal: () => void;
  claimVictoryReward: () => void;
  resetAdversariesProgress: () => void;
}

/**
 * Higieniza o estado dos adversários garantindo progressão linear consistente.
 * Se o boss N foi derrotado, todos os bosses anteriores (0..N-1) também são marcados como derrotados.
 */
function sanitizeAdversaries(
  adversaries: Adversary[],
  currentIndex: number
): { sanitizedAdversaries: Adversary[]; validIndex: number } {
  const list = adversaries && adversaries.length === originalAdversaries.length ? adversaries.map(a => ({ ...a })) : originalAdversaries.map(a => ({ ...a }));
  
  let maxDefeatedIdx = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].isDefeated) {
      maxDefeatedIdx = i;
    }
  }

  if (maxDefeatedIdx >= 0) {
    const userStore = useUserStore.getState();
    for (let i = 0; i <= maxDefeatedIdx; i++) {
      list[i] = {
        ...list[i],
        currentHp: 0,
        isDefeated: true,
      };
      if (list[i].rewardItem?.id) {
        userStore.addItemToInventory(list[i].rewardItem.id);
      }
    }
  }

  const firstUndefeated = list.findIndex((a) => !a.isDefeated);
  const validIndex = firstUndefeated !== -1 ? firstUndefeated : Math.min(list.length - 1, Math.max(0, currentIndex));

  return { sanitizedAdversaries: list, validIndex };
}

export const useDuelStore = create<DuelStoreState>()(
  persist(
    (set, get) => {
      const initial = sanitizeAdversaries(originalAdversaries, 0);

      return {
        adversaries: initial.sanitizedAdversaries,
        currentAdversaryIndex: initial.validIndex,
        combatLogs: [],
        activeVictoryModal: null,
        lastDamageDealt: null,

        isAdversaryUnlocked: (index: number) => {
          if (index <= 0) return true;
          const { adversaries } = get();
          return adversaries[index - 1]?.isDefeated === true;
        },

        reconcileAdversaries: () => {
          const { adversaries, currentAdversaryIndex } = get();
          const { sanitizedAdversaries, validIndex } = sanitizeAdversaries(adversaries, currentAdversaryIndex);
          set({
            adversaries: sanitizedAdversaries,
            currentAdversaryIndex: validIndex,
          });
        },

        getCurrentAdversary: () => {
          const { adversaries, currentAdversaryIndex } = get();
          return adversaries[currentAdversaryIndex] || adversaries[0];
        },

        dealDamageFromMission: (xpAmount, pillarId, equippedItems) => {
          const adversary = get().getCurrentAdversary();
          if (adversary.isDefeated) return;

          const { totalDamage, isCritical, weaknessBonus, message } = calculateDuelDamage(
            xpAmount,
            pillarId,
            adversary,
            equippedItems
          );

          const { updatedAdversary, isDefeatedNow } = applyDamageToAdversary(adversary, totalDamage);

          const newLog: CombatLogEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            damage: totalDamage,
            message,
            isCritical,
            isWeakness: weaknessBonus > 0,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          const updatedList = get().adversaries.map((b, idx) =>
            idx === get().currentAdversaryIndex ? updatedAdversary : b
          );

          set({
            adversaries: updatedList,
            combatLogs: [newLog, ...get().combatLogs.slice(0, 15)],
            lastDamageDealt: {
              amount: totalDamage,
              isCritical,
              id: newLog.id,
            },
          });

          if (isDefeatedNow) {
            soundFx.playLevelUp();
            triggerBossDefeatedConfetti();

            // Adiciona item de recompensa ao inventário do usuário
            const userStore = useUserStore.getState();
            userStore.addItemToInventory(updatedAdversary.rewardItem.id);

            set({
              activeVictoryModal: {
                defeatedBoss: updatedAdversary,
                rewardItem: updatedAdversary.rewardItem,
              },
            });
          }
        },

        selectAdversary: (index) => {
          const { adversaries, isAdversaryUnlocked } = get();
          const safeIndex = Math.min(adversaries.length - 1, Math.max(0, index));
          if (isAdversaryUnlocked(safeIndex)) {
            set({ currentAdversaryIndex: safeIndex });
          }
        },

        closeVictoryModal: () => {
          set({ activeVictoryModal: null });
        },

        claimVictoryReward: () => {
          const { currentAdversaryIndex, adversaries } = get();
          const nextIndex = Math.min(adversaries.length - 1, currentAdversaryIndex + 1);
          set({
            activeVictoryModal: null,
            currentAdversaryIndex: nextIndex,
          });
        },

        resetAdversariesProgress: () => {
          set({
            adversaries: originalAdversaries,
            currentAdversaryIndex: 0,
            combatLogs: [],
            activeVictoryModal: null,
          });
        },
      };
    },
    {
      name: 'making-legends-duel-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.reconcileAdversaries();
        }
      },
    }
  )
);
