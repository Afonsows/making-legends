import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { getLevelUpRyoBetween } from '../../core/ryoEngine';
import { Check } from 'lucide-react';

export const LevelUpModal: React.FC = () => {
  const { activeLevelUpModal, closeLevelUpModal } = useUserStore();
  const { theme } = useTheme();

  if (!activeLevelUpModal) return null;

  const { oldLevel, newLevel, oldRank, newRank } = activeLevelUpModal;
  const isRankUp = oldRank !== newRank;
  const rank = theme.ranks[newRank];
  const ryo = getLevelUpRyoBetween(oldLevel, newLevel);

  return (
    <div className="modal-overlay z-[115] bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        className={`washi-texture bg-shinobi-card border-2 w-full max-w-sm rounded-3xl overflow-hidden p-6 text-center space-y-4 relative animate-in zoom-in-95 ${
          isRankUp ? 'border-shinobi-orange shadow-glow-orange' : 'border-shinobi-gold shadow-glow-gold'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-shinobi-orange/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-slate-950 to-shinobi-card border-2 border-shinobi-orange mx-auto flex flex-col items-center justify-center shadow-glow-orange animate-chakra">
            <span className="font-kanji text-4xl leading-none" style={{ color: rank.titleColor }}>
              {rank.kanji}
            </span>
            <span className="text-2xl mt-1">{rank.badge}</span>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-shinobi-crimson text-white font-mono font-bold text-xs px-3 py-0.5 rounded-full border border-shinobi-bg shadow-md">
            Nível {newLevel}
          </div>
        </div>

        <div className="relative pt-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-shinobi-orange">
            {isRankUp ? 'Promoção concedida pela vila!' : 'Seu chakra se expandiu!'}
          </span>
          <h2 className="font-cinzel text-2xl text-slate-100 mt-1">{isRankUp ? rank.name : `Nível ${newLevel}`}</h2>
          {isRankUp && <div className="text-[11px] font-mono text-slate-500 italic">{rank.reading}</div>}
          <p className="text-xs text-slate-300 mt-2">
            {isRankUp ? rank.description : 'A disciplina diária está moldando um novo shinobi. Continue treinando.'}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-500/40 px-3 py-1 rounded-full">
            🪙 +{ryo} Ryō de promoção
          </div>
        </div>

        <button
          onClick={closeLevelUpModal}
          className="relative w-full py-3 bg-gradient-to-r from-shinobi-orange to-amber-500 text-shinobi-bg font-bold text-xs rounded-xl shadow-glow-orange hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          Continuar a Jornada
        </button>
      </div>
    </div>
  );
};
