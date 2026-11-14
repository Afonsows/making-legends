import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { formatDateBR } from '../../core/dateUtils';
import { History, Flame } from 'lucide-react';

export const ChallengeResetModal: React.FC = () => {
  const { activeResetModal, dismissResetModal, openChallengeHistoryModal, openStartChallengeModal } = useUserStore();
  if (!activeResetModal) return null;

  const { cycle } = activeResetModal;
  const targetDays = cycle.targetDays || 66;

  return (
    <div className="modal-overlay z-[110] bg-black/90 animate-in fade-in">
      <div className="washi-texture bg-slate-900 border border-rose-500/70 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col my-auto relative animate-in zoom-in-95">
        <div className="p-6 bg-rose-950/80 border-b border-rose-500/30 text-center space-y-2 relative overflow-hidden">
          <div className="absolute -top-4 right-2 font-kanji text-[110px] leading-none text-rose-500/10 select-none pointer-events-none">敗</div>
          <div className="font-kanji text-5xl text-rose-400 leading-none">折</div>
          <h3 className="font-cinzel text-xl sm:text-2xl text-slate-100">O desafio foi interrompido</h3>
          <p className="text-xs text-rose-300 font-mono">{cycle.failedReason || 'Faltas acima do permitido na semana'}</p>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-300 text-[12px] leading-relaxed text-center italic">
            "Cair faz parte do caminho ninja. O que define um shinobi é se ele se levanta."
          </p>

          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div>
              <span className="text-slate-400 block text-[10px]">Ciclo</span>
              <span className="font-bold text-rose-300 font-mono text-sm">#{cycle.cycleNumber || 1}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Dias cumpridos</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {cycle.daysCompleted || 0} / {targetDays}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">XP no ciclo</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm">{cycle.totalXpEarned || 0}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 text-[11px] leading-relaxed">
            Seu XP, nível, relíquias e pergaminhos continuam com você — só o ciclo foi encerrado
            {cycle.endDate ? ` em ${formatDateBR(cycle.endDate)}` : ''}. Um novo desafio começa apenas quando você decidir.
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={() => {
              dismissResetModal();
              openChallengeHistoryModal();
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <History className="w-4 h-4 text-amber-400" />
            Ver Histórico
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={dismissResetModal}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Depois
            </button>
            <button
              onClick={() => {
                dismissResetModal();
                openStartChallengeModal();
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-shinobi-orange text-onaccent text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4" />
              Recomeçar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
