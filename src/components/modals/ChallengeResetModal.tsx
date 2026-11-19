import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useChallengeView } from '../../state/challengeSelectors';
import { formatDateBR } from '../../core/dateUtils';
import { Stat } from '../ui/kit';
import { Flame } from 'lucide-react';

/** Aviso único quando um desafio no Modo Elite é encerrado por uma falta. */
export const ChallengeResetModal: React.FC = () => {
  const { activeResetModal, dismissResetModal, openStartChallengeModal } = useUserStore();
  const openDetailModal = useChallengeStore((s) => s.openDetailModal);
  const view = useChallengeView(activeResetModal?.challengeId || null);
  if (!activeResetModal || !view) return null;
  const { challenge, stats } = view;

  return (
    <div className="modal-overlay z-[115] animate-in fade-in">
      <div className="bg-bg border border-line w-full max-w-md rounded-2xl overflow-hidden modal-panel my-auto p-6 text-center animate-pop">
        <div className="t-label !text-accent">Modo Elite · desafio encerrado</div>
        <h3 className="t-title text-[28px] text-ink mt-2.5">{challenge.title}</h3>
        <p className="text-[13px] text-ink2 mt-2 leading-snug">
          No Modo Elite qualquer falta encerra o desafio
          {stats.failedOn ? `. A falta foi em ${formatDateBR(stats.failedOn)}.` : '.'} Se um dia foi marcado e não sincronizou, corrija-o no
          mapa do desafio: ele volta sozinho.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-line text-left">
          <Stat value={stats.daysCompleted} label="Cumpridos" />
          <Stat value={`${stats.adherence}%`} label="Adesão" />
          <Stat value={stats.bestStreak} label="Melhor sequência" />
        </div>
        <p className="text-[13px] text-ink2 mt-5 leading-snug">Seu XP, nível, relíquias e pergaminhos continuam com você.</p>

        <div className="flex flex-col gap-2 mt-6">
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => {
              dismissResetModal();
              openStartChallengeModal(challenge.id);
            }}
          >
            <Flame className="w-4 h-4" /> Recomeçar com estes hábitos
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => {
                dismissResetModal();
                openDetailModal(challenge.id);
              }}
            >
              Ver mapa
            </button>
            <button type="button" className="btn btn-ghost flex-1" onClick={dismissResetModal}>
              Depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
