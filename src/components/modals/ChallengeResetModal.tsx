import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { AlertTriangle, RotateCcw, History, Shield, Flame, CheckCircle2 } from 'lucide-react';

export const ChallengeResetModal: React.FC = () => {
  const { activeResetModal, dismissResetModal, openChallengeHistoryModal } = useUserStore();

  if (!activeResetModal) return null;

  const { cycle } = activeResetModal;

  const handleStartFresh = () => {
    dismissResetModal();
  };

  const handleOpenHistory = () => {
    dismissResetModal();
    openChallengeHistoryModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-rose-500/70 w-full max-w-lg rounded-3xl overflow-hidden shadow-glow-crimson flex flex-col my-auto relative z-[101]">
        {/* Top Banner com Destaque */}
        <div className="p-6 bg-gradient-to-b from-rose-950/80 to-slate-950/90 border-b border-rose-500/30 text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 mx-auto shadow-glow-crimson animate-bounce">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h3 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-100">
            Desafio dos 66 Dias Reiniciado
          </h3>

          <p className="text-xs text-rose-300 font-mono">
            {cycle.failedReason || '2 faltas registradas na mesma semana'}
          </p>
        </div>

        {/* Corpo Explicativo */}
        <div className="p-6 space-y-4 text-xs">
          <div className="pergaminho-bg rounded-2xl border border-rose-500/30 p-4 space-y-2 shadow-md">
            <h4 className="font-cinzel font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <span>A Regra dos 66 Dias</span>
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Na tradição shinobi e na ciência dos hábitos de Phillippa Lally, duas ausências na mesma semana rompem o condicionamento neural. Por isso, o ciclo anterior foi encerrado e salvo no seu <strong>Histórico de Desafios</strong>.
            </p>
          </div>

          {/* Resumo do Ciclo Arquivado */}
          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Ciclo Encerrado</span>
              <span className="font-bold text-rose-400 font-mono text-sm">
                Ciclo #{cycle.cycleNumber || 1}
              </span>
            </div>

            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Dias Concluídos</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {cycle.daysCompleted || 0} / 66
              </span>
            </div>

            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">XP Acumulado</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm">
                {cycle.totalXpEarned || 0} XP
              </span>
            </div>
          </div>

          <p className="text-slate-400 text-center text-[11px]">
            Um novo ciclo de 66 dias foi iniciado para você no <strong>Dia 1/66</strong>. Não desanime: cada reinício é uma forja para a verdadeira disciplina!
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={handleOpenHistory}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Ver Área de Histórico</span>
          </button>

          <button
            onClick={handleStartFresh}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:opacity-95 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Iniciar Novo Desafio (1/66)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
