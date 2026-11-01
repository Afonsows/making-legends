import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { Trophy, Sparkles, History, Flame, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { formatDateBR } from '../../core/dateUtils';

export const ChallengeCompletionModal: React.FC = () => {
  const { 
    activeCompletionModal, 
    dismissCompletionModal, 
    openStartChallengeModal, 
    openChallengeHistoryModal 
  } = useUserStore();

  if (!activeCompletionModal) return null;

  const { cycle } = activeCompletionModal;
  const targetDays = cycle.targetDays || 66;

  const handleStartNext = () => {
    dismissCompletionModal();
    openStartChallengeModal();
  };

  const handleOpenHistory = () => {
    dismissCompletionModal();
    openChallengeHistoryModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-shinobi-gold w-full max-w-lg rounded-3xl overflow-hidden shadow-glow-gold flex flex-col my-auto relative z-[101]">
        {/* Top Banner Dourado de Vitória */}
        <div className="p-6 bg-gradient-to-b from-amber-950/80 via-slate-950 to-slate-950 border-b border-shinobi-gold/40 text-center space-y-2 relative overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-shinobi-orange flex items-center justify-center mx-auto shadow-glow-orange animate-chakra">
            <span className="hanko-stamp animate-stamp text-5xl px-2 py-1.5">完</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-shinobi-gold/20 border border-shinobi-gold/50 text-shinobi-gold text-[10px] font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MESTRIA SHINOBI ALCANÇADA</span>
          </div>

          <h3 className="font-cinzel text-xl sm:text-2xl text-slate-100">
            Juramento Cumprido!
          </h3>

          <p className="text-xs text-amber-300 font-mono">
            {cycle.title || `Desafio de ${targetDays} dias`}{cycle.endDate ? ` • ${formatDateBR(cycle.startDate)} a ${formatDateBR(cycle.endDate)}` : ''}
          </p>
        </div>

        {/* Corpo Explicativo */}
        <div className="p-6 space-y-4 text-xs">
          <div className="pergaminho-bg rounded-2xl border border-shinobi-gold/40 p-4 space-y-2 shadow-md">
            <h4 className="font-cinzel text-slate-100 text-sm flex items-center gap-1.5">
              <span>{targetDays} dias de disciplina forjados</span>
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Você manteve a palavra até o último dia. O ciclo foi guardado com honra no seu <strong>Histórico de Desafios</strong> e a vila te recompensou: <strong className="text-amber-300">+{cycle.rewardXp || 0} XP</strong> e <strong className="text-amber-300">+{cycle.rewardRyo || 0} Ryō</strong>.
            </p>
          </div>

          {/* Resumo do Ciclo Concluído */}
          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Ciclo</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm">
                Ciclo #{cycle.cycleNumber || 1}
              </span>
            </div>

            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Presenças</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">
                {cycle.daysCompleted || 0} / {targetDays}
              </span>
            </div>

            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">XP Conquistado</span>
              <span className="font-bold text-amber-300 font-mono text-sm">
                {cycle.totalXpEarned || 0} XP
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center text-slate-300 text-[11px]">
            O próximo ciclo <strong>não inicia automaticamente</strong>. Descanse ou personalize suas próximas metas para iniciar quando estiver pronto!
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={handleOpenHistory}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Ver Histórico</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={dismissCompletionModal}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold transition-all text-center"
            >
              Decidir Depois
            </button>

            <button
              onClick={handleStartNext}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-shinobi-orange via-amber-500 to-shinobi-crimson hover:brightness-110 text-slate-950 font-bold text-xs rounded-xl shadow-glow-orange transition-all flex items-center justify-center gap-1.5"
            >
              <Flame className="w-4 h-4" />
              <span>Próximo Desafio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
