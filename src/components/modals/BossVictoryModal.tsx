import React from 'react';
import { useDuelStore } from '../../state/useDuelStore';
import { Swords, Gift, Sparkles, Check } from 'lucide-react';

export const BossVictoryModal: React.FC = () => {
  const { activeVictoryModal, claimVictoryReward } = useDuelStore();

  if (!activeVictoryModal) return null;

  const { defeatedBoss, rewardItem } = activeVictoryModal;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-shinobi-card border-2 border-shinobi-crimson w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4 relative animate-in zoom-in-95 duration-300 relative z-[101]">
        <div className="w-20 h-20 rounded-full bg-rose-950/60 border-2 border-rose-500 mx-auto flex items-center justify-center text-4xl shadow-glow-crimson">
          🏆
        </div>

        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400">
            ADVERSÁRIO #{defeatedBoss.number} DOMINADO!
          </span>
          <h2 className="font-cinzel text-xl font-bold text-slate-100 mt-1">
            {defeatedBoss.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            A consistência das suas missões quebrou a resistência do adversário.
          </p>
        </div>

        {/* Recompensa Obtida com Buff Real */}
        <div className="bg-shinobi-bg p-3.5 rounded-2xl border border-shinobi-gold/60 text-left space-y-1.5 shadow-glow-gold/20">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{rewardItem.icon}</span>
            <div>
              <div className="text-xs font-bold text-slate-100">{rewardItem.name}</div>
              <div className="text-[10px] text-shinobi-gold font-mono uppercase">{rewardItem.type}</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-300">
            {rewardItem.description}
          </p>
          <div className="text-[10px] font-mono font-bold text-shinobi-jade pt-1 border-t border-shinobi-border">
            ✨ Efeito Ativo: +{rewardItem.buffValue}% {rewardItem.buffType.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <button
          onClick={claimVictoryReward}
          className="w-full py-3 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow text-white font-bold text-xs rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          Equipar Relíquia & Próximo Chefe
        </button>
      </div>
    </div>
  );
};
