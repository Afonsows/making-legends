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
  Flame,
  Zap
} from 'lucide-react';
import { ProtocolChallengeCycle } from '../../core/types';
import { formatDateBR } from '../../core/streakEngine';

interface ChallengeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChallengeHistoryModal: React.FC<ChallengeHistoryModalProps> = ({ isOpen, onClose }) => {
  const { profile, openStartChallengeModal, restoreArchivedCycle } = useUserStore();
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const history = profile.challengeHistory || [];
  const activeCycle = profile.activeChallenge;

  const toggleExpand = (id: string) => {
    setExpandedCycleId(expandedCycleId === id ? null : id);
  };

  const handleOpenStartModal = () => {
    onClose();
    openStartChallengeModal();
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
                Todas as tentativas, conclusões e registros diários dos seus desafios
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
          {/* Card do Ciclo Ativo Atual ou Convite para Iniciar */}
          {activeCycle && activeCycle.status === 'active' ? (
            <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-gold/70 p-4 sm:p-5 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-shinobi-gold/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-glow-jade" />
                  <h4 className="font-cinzel font-bold text-slate-100 text-sm sm:text-base">
                    {activeCycle.title || `Desafio ${activeCycle.targetDays || 66} Dias`} — Ciclo #{activeCycle.cycleNumber || 1}
                  </h4>
                </div>
                <span className="text-xs font-mono text-shinobi-gold">
                  Iniciado em: {formatDateBR(activeCycle.startDate)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Dia Atual</span>
                  <span className="font-bold text-shinobi-gold font-mono text-sm">
                    Dia {activeCycle.currentDay || 0} / {activeCycle.targetDays || 66}
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
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border-2 border-dashed border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Nenhum Ciclo em Andamento
                </span>
                <p className="text-[11px] text-slate-400">
                  Você não tem nenhum desafio ativo no momento. Inicie um novo ciclo quando estiver pronto!
                </p>
              </div>
              <button
                onClick={handleOpenStartModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Personalizar e Iniciar ⚡</span>
              </button>
            </div>
          )}

          {restoreMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">{restoreMsg}</div>
          )}

          {/* Lista de Ciclos Arquivados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-cinzel text-sm font-bold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-shinobi-gold" />
                <span>Ciclos Anteriores Arquivados ({history.length})</span>
              </h4>

              <button
                onClick={handleOpenStartModal}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                title="Personalizar e iniciar um novo desafio"
              >
                <Zap className="w-3 h-3" />
                <span>Iniciar Novo Desafio</span>
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
                                {isCompleted ? `CONCLUÍDO (${cycle.targetDays || 66}/${cycle.targetDays || 66})` : (cycle.failedReason || 'ENCERRADO')}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {formatDateBR(cycle.startDate)} até {cycle.endDate ? formatDateBR(cycle.endDate) : '—'} • {cycle.daysCompleted || 0}/{cycle.targetDays || 66} presenças • {cycle.totalXpEarned || 0} XP
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {!isCompleted && !(activeCycle && activeCycle.status === 'active') && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Reavaliar e restaurar o Ciclo #${cycle.cycleNumber || 1}? Só é possível se o histórico real de dias não violar as regras.`)) {
                                  const ok = restoreArchivedCycle(cycle.id);
                                  if (ok) onClose();
                                  else setRestoreMsg(`O Ciclo #${cycle.cycleNumber || 1} não pode ser restaurado: os dias registrados confirmam o encerramento.`);
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold rounded-xl border border-rose-800 transition-colors flex items-center gap-1.5"
                              title="Restaurar este ciclo como ativo"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reavaliar</span>
                            </button>
                          )}

                          <button
                            onClick={() => toggleExpand(cycle.id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                          >
                            <span>{isExpanded ? 'Ocultar Detalhes' : `Ver ${cycle.targetDays || 66} Dias`}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Mapa Mini dos Dias Deste Ciclo Específico */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Mapa de Presença dos {cycle.targetDays || 66} Dias do Ciclo #{cycle.cycleNumber}:
                          </span>

                          <div className="grid grid-cols-6 sm:grid-cols-11 gap-1">
                            {Array.from({ length: cycle.targetDays || 66 }, (_, i) => {
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
