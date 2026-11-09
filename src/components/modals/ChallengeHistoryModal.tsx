import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { 
  X, 
  History, 
  Award, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Sparkles,
  Zap
} from 'lucide-react';
import { ProtocolChallengeCycle } from '../../core/types';
import { formatDateBR } from '../../core/streakEngine';

interface ChallengeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChallengeHistoryModal: React.FC<ChallengeHistoryModalProps> = ({ isOpen, onClose }) => {
  const {
    profile,
    openStartChallengeModal,
    restoreArchivedCycle,
    deleteHistoryCycle,
    clearChallengeHistory,
    deleteActiveChallenge,
  } = useUserStore();

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

  const handleDeleteHistoryCycle = (cycleId: string, cycleNumber: number) => {
    if (window.confirm(`Deseja realmente excluir o Ciclo #${cycleNumber} do seu histórico? Esta ação é irreversível.`)) {
      deleteHistoryCycle(cycleId);
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de ciclos anteriores? Todos os registros antigos de desafios arquivados serão apagados.')) {
      clearChallengeHistory();
    }
  };

  const handleDeleteActiveCycle = () => {
    if (window.confirm('Deseja realmente cancelar e excluir o Desafio Ativo atual? Seus dados diários e sequência continuarão salvos.')) {
      deleteActiveChallenge();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-shinobi-gold/60 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>Histórico de Desafios & Ciclos</span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                Gerencie com total liberdade seus ciclos passados e o desafio ativo
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
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Card do Ciclo Ativo Atual ou Convite para Iniciar */}
          {activeCycle && activeCycle.status === 'active' ? (
            <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-gold/70 p-4 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-shinobi-gold/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-glow-jade" />
                  <h4 className="font-cinzel font-bold text-slate-100 text-xs sm:text-sm">
                    {activeCycle.title || `Desafio ${activeCycle.targetDays || 66} Dias`} — Ciclo #{activeCycle.cycleNumber || 1}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-shinobi-gold">
                    Iniciado em: {formatDateBR(activeCycle.startDate)}
                  </span>

                  <button
                    type="button"
                    onClick={handleDeleteActiveCycle}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                    title="Cancelar e excluir o desafio ativo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Dia Atual</span>
                  <span className="font-bold text-shinobi-gold font-mono text-xs sm:text-sm">
                    Dia {activeCycle.currentDay || 0} / {activeCycle.targetDays || 66}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Presenças</span>
                  <span className="font-bold text-emerald-400 font-mono text-xs sm:text-sm">
                    {activeCycle.daysCompleted || 0} dias
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Sequência</span>
                  <span className="font-bold text-rose-400 font-mono text-xs sm:text-sm">
                    {profile.currentStreak} dias
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">XP Acumulado</span>
                  <span className="font-bold text-amber-300 font-mono text-xs sm:text-sm">
                    {activeCycle.totalXpEarned || 0} XP
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/80 border-2 border-dashed border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Nenhum Ciclo em Andamento
                </span>
                <p className="text-[11px] text-slate-400">
                  Você não tem nenhum desafio ativo. Inicie um novo quando estiver pronto!
                </p>
              </div>
              <button
                onClick={handleOpenStartModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Iniciar Desafio ⚡</span>
              </button>
            </div>
          )}

          {restoreMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">{restoreMsg}</div>
          )}

          {/* Lista de Ciclos Arquivados */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-cinzel text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-shinobi-gold" />
                <span>Ciclos Anteriores ({history.length})</span>
              </h4>

              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                    title="Apagar todo o histórico de ciclos passados"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar Histórico</span>
                  </button>
                )}

                <button
                  onClick={handleOpenStartModal}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                  title="Iniciar um novo desafio"
                >
                  <Zap className="w-3 h-3" />
                  <span>Novo Desafio</span>
                </button>
              </div>
            </div>

            {history.length > 0 ? (
              <div className="space-y-2">
                {history.map((cycle: ProtocolChallengeCycle) => {
                  const isExpanded = expandedCycleId === cycle.id;
                  const isCompleted = cycle.status === 'completed';

                  return (
                    <div
                      key={cycle.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-glow-jade/10'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {isCompleted ? '🏆' : '✗'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-cinzel font-bold text-slate-100 text-xs sm:text-sm">
                                Ciclo #{cycle.cycleNumber || 1}
                              </span>
                              <span className={`text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${
                                isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              }`}>
                                {isCompleted ? `CONCLUÍDO (${cycle.targetDays || 66}/${cycle.targetDays || 66})` : (cycle.failedReason || 'ENCERRADO')}
                              </span>
                            </div>

                            <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                              {formatDateBR(cycle.startDate)} {cycle.endDate ? `até ${formatDateBR(cycle.endDate)}` : ''} • {cycle.daysCompleted || 0}/{cycle.targetDays || 66} dias • {cycle.totalXpEarned || 0} XP
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          {!isCompleted && !(activeCycle && activeCycle.status === 'active') && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Reavaliar e restaurar o Ciclo #${cycle.cycleNumber || 1}? Só é possível se o histórico real de dias não violar as regras.`)) {
                                  const ok = restoreArchivedCycle(cycle.id);
                                  if (ok) onClose();
                                  else setRestoreMsg(`O Ciclo #${cycle.cycleNumber || 1} não pode ser restaurado: os dias registrados confirmam o encerramento.`);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold rounded-xl border border-rose-800 transition-colors flex items-center gap-1"
                              title="Restaurar este ciclo como ativo"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Restaurar</span>
                            </button>
                          )}

                          <button
                            onClick={() => toggleExpand(cycle.id)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Recolher' : 'Ver Dias'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {/* Botão de Excluir este ciclo */}
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryCycle(cycle.id, cycle.cycleNumber || 1)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                            title="Excluir este ciclo do histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Mapa Mini dos Dias Deste Ciclo */}
                      {isExpanded && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5 animate-in fade-in">
                          <span className="text-[10px] text-slate-400 block font-mono">
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
                                  className={`h-6 sm:h-7 rounded-lg text-[9px] font-mono flex items-center justify-center font-bold border ${
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
              <div className="p-6 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-1">
                <p>Nenhum ciclo anterior arquivado no momento.</p>
                <p className="text-[10px] text-slate-500">
                  Desafios finalizados ou cancelados aparecem aqui com opção de restauração ou exclusão permanente.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t-2 border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            A constância diária é o segredo dos grandes ninjas.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all ml-auto"
          >
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
};
