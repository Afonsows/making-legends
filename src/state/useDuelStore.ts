import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Adversary, Item } from '../core/types';
import { PillarId } from '../theme/types';
import { originalAdversaries } from '../core/adversariesData';
import { calculateDuelDamage, applyDamageToAdversary } from '../core/duelEngine';
import { useUserStore } from './useUserStore';
import { soundFx } from '../utils/audio';
import { triggerBossDefeatedConfetti } from '../utils/confetti';

interface CombatLogEntry {
  id: string;
  damage: number;
  message: string;
  isCritical: boolean;
  isWeakness: boolean;
  timestamp: string;
}

interface DuelStoreState {
  adversaries: Adversary[];
  currentAdversaryIndex: number;
  combatLogs: CombatLogEntry[];
  activeVictoryModal: { defeatedBoss: Adversary; rewardItem: Item } | null;
  lastDamageDealt: { amount: number; isCritical: boolean; id: string } | null;

  // Actions
  getCurrentAdversary: () => Adversary;
  dealDamageFromMission: (xpAmount: number, pillarId: PillarId, equippedItems: Item[]) => void;
  selectAdversary: (index: number) => void;
  closeVictoryModal: () => void;
  claimVictoryReward: () => void;
  resetAdversariesProgress: () => void;
}

export const useDuelStore = create<DuelStoreState>()(
  persist(
    (set, get) => ({
      adversaries: originalAdversaries,
      currentAdversaryIndex: 0,
      combatLogs: [],
      activeVictoryModal: null,
      lastDamageDealt: null,

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
        const safeIndex = Math.min(get().adversaries.length - 1, Math.max(0, index));
        set({ currentAdversaryIndex: safeIndex });
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
    }),
    {
      name: 'making-legends-duel-store',
    }
  )
);
