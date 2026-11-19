import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useChallengeView } from '../../state/challengeSelectors';
import { challengeRewardKey } from '../../core/challenges';
import { formatDateBR } from '../../core/dateUtils';
import { isBoard } from '../../core/board';
import { Stat } from '../ui/kit';
import { Trophy } from 'lucide-react';

/** Comemoração quando um desafio chega ao fim. Oferece começar outro com os mesmos hábitos. */
export const ChallengeCompletionModal: React.FC = () => {
  const { activeCompletionModal, dismissCompletionModal, openStartChallengeModal } = useUserStore();
  const grant = useUserStore((s) => (activeCompletionModal ? s.profile.grants?.[challengeRewardKey(activeCompletionModal.challengeId)] : undefined));
  const openDetailModal = useChallengeStore((s) => s.openDetailModal);
  const view = useChallengeView(activeCompletionModal?.challengeId || null);
  if (!activeCompletionModal || !view) return null;
  const { challenge, stats } = view;

  return (
    <div className="modal-overlay z-[115] animate-in fade-in">
      <div className="bg-bg border border-line w-full max-w-md rounded-2xl overflow-hidden modal-panel my-auto p-6 text-center animate-pop">
        <div className="w-14 h-14 rounded-full border border-gold/60 text-gold flex items-center justify-center mx-auto">
          <Trophy className="w-7 h-7" />
        </div>
        <div className="t-label mt-5 !text-ok">Desafio concluído</div>
        <h3 className="t-title text-[28px] text-ink mt-2.5">{challenge.title}</h3>
        <p className="text-[13px] text-ink2 mt-2 tabular">
          {formatDateBR(challenge.startDate)} a {formatDateBR(stats.endDate)} · {stats.targetDays} dias
        </p>

        <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-line text-left">
          <Stat value={stats.daysCompleted} label="Cumpridos" />
          <Stat value={`${stats.adherence}%`} label="Adesão" />
          <Stat value={stats.bestStreak} label="Melhor sequência" />
        </div>
        {grant && (
          <p className="text-[15px] text-ink mt-5">
            Bônus de conclusão: <strong className="tabular">+{grant.xp} XP</strong> e <strong className="tabular">+{grant.ryo} Ryō</strong>
          </p>
        )}
        <p className="text-[13px] text-ink2 mt-3 leading-snug">Os hábitos dele saíram da tela Hoje. O histórico fica guardado no desafio.</p>

        <div className="flex flex-col gap-2 mt-6">
          {!isBoard(challenge) && (
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => {
                dismissCompletionModal();
                openStartChallengeModal(challenge.id);
              }}
            >
              Começar outro com estes hábitos
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => {
                dismissCompletionModal();
                openDetailModal(challenge.id);
              }}
            >
              Ver desafio
            </button>
            <button type="button" className="btn btn-ghost flex-1" onClick={dismissCompletionModal}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
