import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { 
  X, 
  History, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Sparkles,
  Flame
} from 'lucide-react';
import { ProtocolChallengeCycle } from '../../core/types';

interface ChallengeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChallengeHistoryModal: React.FC<ChallengeHistoryModalProps> = ({ isOpen, onClose }) => {
  const { profile, startNewChallengeCycle } = useUserStore();
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);

  if (!isOpen) return null;

  const history = profile.challengeHistory || [];
  const activeCycle = profile.activeChallenge;

  const toggleExpand = (id: string) => {
    setExpandedCycleId(expandedCycleId === id ? null : id);
  };

  const handleManualRestart = () => {
    if (window.confirm('Deseja encerrar o ciclo atual, arquivá-lo no histórico e iniciar um novo Desafio dos 66 Dias no Dia 1/66?')) {
      startNewChallengeCycle();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-shinobi-gold/60 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] my-auto relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-base sm:text-lg flex items-center gap-2">
                <span>Área de Histórico de Desafios</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoria de todos os ciclos dos 66 dias • Tentativas, conclusões e registros diários
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Card do Ciclo Ativo Atual */}
          {activeCycle && (
            <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-gold/70 p-4 sm:p-5 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-shinobi-gold/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-glow-jade" />
                  <h4 className="font-cinzel font-bold text-slate-100 text-sm sm:text-base">
                    Ciclo #{activeCycle.cycleNumber || 1} — Em Andamento
                  </h4>
                </div>
                <span className="text-xs font-mono text-shinobi-gold">
                  Iniciado em: {new Date(activeCycle.startDate).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Dia Atual</span>
                  <span className="font-bold text-shinobi-gold font-mono text-sm">
                    Dia {activeCycle.currentDay || profile.currentProtocolDay || 1} / 66
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Presenças Marcadas</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {activeCycle.daysCompleted || 0} dias
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Sequência Atual</span>
                  <span className="font-bold text-rose-400 font-mono text-sm">
                    {profile.currentStreak} dias
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">XP Acumulado</span>
                  <span className="font-bold text-amber-300 font-mono text-sm">
                    {activeCycle.totalXpEarned || 0} XP
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Ciclos Arquivados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-cinzel text-sm font-bold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-shinobi-gold" />
                <span>Ciclos Anteriores Arquivados ({history.length})</span>
              </h4>

              <button
                onClick={handleManualRestart}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                title="Arquivar o ciclo atual e começar um novo ciclo 1/66"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reiniciar Novo Ciclo 1/66</span>
              </button>
            </div>

            {history.length > 0 ? (
              <div className="space-y-2.5">
                {history.map((cycle: ProtocolChallengeCycle) => {
                  const isExpanded = expandedCycleId === cycle.id;
                  const isCompleted = cycle.status === 'completed';

                  return (
                    <div
                      key={cycle.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-glow-jade/10'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {isCompleted ? '🏆' : '✗'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-cinzel font-bold text-slate-100 text-sm">
                                Ciclo #{cycle.cycleNumber || 1}
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${
                                isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              }`}>
                                {isCompleted ? 'CONCLUÍDO (66/66)' : (cycle.failedReason || 'ENCERRADO (2 Faltas)')}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {cycle.startDate} até {cycle.endDate || '—'} • {cycle.daysCompleted || 0}/66 presenças • {cycle.totalXpEarned || 0} XP
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleExpand(cycle.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <span>{isExpanded ? 'Ocultar Detalhes' : 'Ver 66 Dias'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Mapa Mini dos 66 Dias Deste Ciclo Específico */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Mapa de Presença dos 66 Dias do Ciclo #{cycle.cycleNumber}:
                          </span>

                          <div className="grid grid-cols-6 sm:grid-cols-11 gap-1">
                            {Array.from({ length: 66 }, (_, i) => {
                              const dayNum = i + 1;
                              const record = cycle.checkIns?.[dayNum];
                              const isChecked = Boolean(record?.checked);
                              const wasAttempted = Boolean(record);

                              return (
                                <div
                                  key={dayNum}
                                  title={`Dia ${dayNum}: ${isChecked ? 'Presença confirmada ✓' : wasAttempted ? 'Falta ✗' : 'Não alcançado'}`}
                                  className={`h-7 rounded-lg text-[9px] font-mono flex items-center justify-center font-bold border ${
                                    isChecked
                                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                                      : wasAttempted
                                      ? 'bg-rose-950/70 border-rose-500 text-rose-400'
                                      : 'bg-slate-900/40 border-slate-800 text-slate-600'
                                  }`}
                                >
                                  {isChecked ? '✓' : wasAttempted ? '✗' : dayNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-1">
                <p>Nenhum ciclo anterior arquivado ainda.</p>
                <p className="text-[11px] text-slate-500">
                  Seus desafios anteriores e histórico de conclusões serão salvos automaticamente aqui.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t-2 border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            A constância diária é o segredo dos grandes ninjas.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all ml-auto"
          >
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
};
