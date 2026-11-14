import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { getLevelUpRyoBetween } from '../../core/ryoEngine';

/** Subiu de nível (ou de patente): um número grande, uma frase e um botão. */
export const LevelUpModal: React.FC = () => {
  const { activeLevelUpModal, closeLevelUpModal } = useUserStore();
  const { theme } = useTheme();

  if (!activeLevelUpModal) return null;

  const { oldLevel, newLevel, oldRank, newRank } = activeLevelUpModal;
  const isRankUp = oldRank !== newRank;
  const rank = theme.ranks[newRank];
  const ryo = getLevelUpRyoBetween(oldLevel, newLevel);

  return (
    <div className="modal-overlay z-[115] animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isRankUp ? `Nova patente: ${rank.name}` : `Nível ${newLevel}`}
        className="bg-surface border border-line w-full max-w-sm rounded-2xl p-7 text-center animate-in zoom-in-95"
      >
        <div className="t-label !text-gold">{isRankUp ? 'Nova patente' : 'Novo nível'}</div>

        <div className="t-num text-[88px] text-ink mt-5">{newLevel}</div>

        <h2 className="t-title text-[26px] text-ink mt-5">{isRankUp ? rank.name : `Nível ${newLevel}`}</h2>
        <p className="text-sm text-ink2 mt-2.5 leading-snug">
          {isRankUp ? rank.description : 'A disciplina diária está fazendo efeito. Continue.'}
        </p>

        {ryo > 0 && (
          <div className="chip mt-5 mx-auto !h-8 !text-gold tabular">+{ryo} Ryō de promoção</div>
        )}

        <button type="button" onClick={closeLevelUpModal} className="btn btn-primary w-full mt-6">
          Continuar
        </button>
      </div>
    </div>
  );
};
