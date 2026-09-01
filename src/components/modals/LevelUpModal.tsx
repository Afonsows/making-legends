import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { Sparkles, Award, ArrowUpRight, Check } from 'lucide-react';

export const LevelUpModal: React.FC = () => {
  const { activeLevelUpModal, closeLevelUpModal } = useUserStore();
  const { theme, getRankByLevel } = useTheme();

  if (!activeLevelUpModal) return null;

  const { oldLevel, newLevel, oldRank, newRank } = activeLevelUpModal;
  const isRankUp = oldRank !== newRank;
  const newRankInfo = getRankByLevel(newLevel);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-shinobi-card border-2 border-shinobi-gold w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4 relative animate-in zoom-in-95 duration-300 relative z-[101]">
        {/* Glow de Fundo */}
        <div className="absolute inset-0 bg-gradient-to-b from-shinobi-gold/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-900 to-shinobi-card border-2 border-shinobi-gold mx-auto flex items-center justify-center text-5xl shadow-glow-gold">
            {newRankInfo.badge}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-shinobi-crimson text-white font-mono font-bold text-xs px-3 py-0.5 rounded-full border border-shinobi-bg shadow-md">
            Nível {newLevel}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-shinobi-gold">
            {isRankUp ? 'NOVA PATENTE SHINOBI CONQUISTADA!' : 'EXPANSÃO DE CHAKRA!'}
          </span>
          <h2 className="font-cinzel text-2xl font-bold text-slate-100 mt-1">
            {isRankUp ? newRankInfo.name : `Nível ${newLevel} Alcançado!`}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isRankUp ? newRankInfo.description : 'Sua constância gerou novos fluxos neurais de disciplina.'}
          </p>
        </div>

        <button
          onClick={closeLevelUpModal}
          className="w-full py-3 bg-gradient-to-r from-shinobi-gold to-amber-500 text-shinobi-bg font-bold text-xs rounded-xl shadow-glow-gold hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          Continuar Jornada
        </button>
      </div>
    </div>
  );
};
