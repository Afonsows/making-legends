import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { 
  evaluateProtocolStatus, 
  getChallengeWeekNumber, 
  getWeekDayRange 
} from '../../core/streakEngine';
import { 
  Check, 
  Lock, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  Map, 
  History, 
  Flame, 
  Info,
  CalendarCheck,
  Zap
} from 'lucide-react';

interface DailyCheckInCardProps {
  onOpenMap?: () => void;
  onOpenHistory?: () => void;
}

export const DailyCheckInCard: React.FC<DailyCheckInCardProps> = ({ 
  onOpenMap, 
  onOpenHistory 
}) => {
  const { profile, toggleDailyCheckIn, openChallengeMapModal, openChallengeHistoryModal } = useUserStore();
  const { missions } = useHabitStore();

  const [showTooltip, setShowTooltip] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const { currentDay, isTodayCheckedIn, xpProgress, missedDaysInCurrentWeek } = protocolStatus;
  const currentWeek = getChallengeWeekNumber(currentDay);
  const { startDay, endDay } = getWeekDayRange(currentWeek);

  const handleToggle = () => {
    const result = toggleDailyCheckIn(currentDay);
    if (!result.success && result.reason) {
      setFeedbackMsg(result.reason);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else if (result.success) {
      if (result.isChecked) {
        setFeedbackMsg(`✨ Presença confirmada no Dia ${currentDay}/66! Continue firme.`);
      } else {
        setFeedbackMsg(`Presença desmarcada para o Dia ${currentDay}.`);
      }
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const handleOpenMapClick = onOpenMap || openChallengeMapModal;
  const handleOpenHistoryClick = onOpenHistory || openChallengeHistoryModal;

  return (
    <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-gold/60 p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Luz ambiente de fundo */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-shinobi-gold/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-shinobi-crimson/10 rounded-full blur-3xl pointer-events-none" />

      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold font-bold border border-shinobi-gold/40">
              Desafio dos 66 Dias — Ciclo #{profile.activeChallenge?.cycleNumber || 1}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Semana {currentWeek} (Dias {startDay}-{endDay})
            </span>
          </div>

          <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Presença Diária — Dia {currentDay} de 66</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {protocolStatus.phaseName} (Fase {protocolStatus.phaseIndex}) — {protocolStatus.totalDaysRemaining} dias restantes para a Maestria Kage
          </p>
        </div>

        {/* Botões de Acesso ao Mapa e Histórico */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleOpenMapClick}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-shinobi-gold border border-shinobi-gold/50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            title="Ver mapa dos 66 dias"
          >
            <Map className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mapa 66 Dias</span>
            <span className="sm:hidden">Mapa</span>
          </button>

          <button
            onClick={handleOpenHistoryClick}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            title="Ver histórico de desafios anteriores"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Histórico</span>
            <span className="sm:hidden">Ciclos</span>
          </button>
        </div>
      </div>

      {/* Caixa de Seleção Principal do Dia com Regra dos 50% de XP */}
      <div className="bg-slate-950/85 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 relative shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lado Esquerdo: Checkbox & Status */}
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Caixa de Seleção / Checkbox Interativo */}
          <div 
            className="relative flex-shrink-0"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              type="button"
              onClick={handleToggle}
              aria-label={`Marcar presença do Dia ${currentDay}`}
              className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 select-none relative ${
                isTodayCheckedIn
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-400 text-slate-950 shadow-glow-jade scale-105'
                  : xpProgress.isUnlocked
                  ? 'bg-amber-950/40 border-shinobi-gold text-shinobi-gold hover:bg-shinobi-gold/20 hover:scale-105 shadow-glow-gold animate-pulse cursor-pointer'
                  : 'bg-slate-900/90 border-slate-700 text-slate-500 cursor-not-allowed opacity-80 hover:border-slate-500'
              }`}
            >
              {isTodayCheckedIn ? (
                <Check className="w-7 h-7 stroke-[3] text-white" />
              ) : xpProgress.isUnlocked ? (
                <Sparkles className="w-6 h-6 text-shinobi-gold animate-spin-slow" />
              ) : (
                <Lock className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Tooltip Hover Explicativo da Condição dos 50% de XP */}
            {showTooltip && (
              <div className="absolute left-0 bottom-full mb-3 z-50 w-72 sm:w-80 p-3.5 bg-slate-950 border-2 border-shinobi-gold/70 rounded-2xl shadow-2xl text-xs space-y-2 animate-in fade-in zoom-in-95 pointer-events-none">
                <div className="flex items-center gap-2 font-cinzel font-bold text-slate-100">
                  {isTodayCheckedIn ? (
                    <>
                      <CalendarCheck className="w-4 h-4 text-emerald-400" />
                      <span>Presença Confirmada!</span>
                    </>
                  ) : xpProgress.isUnlocked ? (
                    <>
                      <Sparkles className="w-4 h-4 text-shinobi-gold" />
                      <span>Presença Desbloqueada!</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-rose-400" />
                      <span>Presença Bloqueada (50% XP)</span>
                    </>
                  )}
                </div>

                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {isTodayCheckedIn
                    ? `Você já registrou a presença para o Dia ${currentDay}/66. Clique novamente caso queira desmarcar.`
                    : xpProgress.isUnlocked
                    ? `Meta de 50% de XP atingida (${xpProgress.currentXp}/${xpProgress.totalTargetXp} XP). Clique na caixa para registrar a sua presença!`
                    : `Para marcar presença no Dia ${currentDay}, você precisa atingir pelo menos 50% do XP previsto para hoje.`}
                </p>

                <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Progresso diário de XP:</span>
                  <span className={xpProgress.isUnlocked ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {xpProgress.currentXp} / {xpProgress.target50PctXp} XP ({xpProgress.progressPercent}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Texto e Instrução ao Lado da Caixa */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                {isTodayCheckedIn
                  ? `Presença do Dia ${currentDay}/66 Confirmada!`
                  : xpProgress.isUnlocked
                  ? `Pronto para Marcar o Dia ${currentDay}/66!`
                  : `Caixa do Dia ${currentDay}/66 (Pendente 50% XP)`}
              </span>
              {isTodayCheckedIn && (
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/40">
                  PRESENTE ✓
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              {isTodayCheckedIn
                ? `Dia concluído com honra! Continue com o mesmo foco amanhã.`
                : xpProgress.isUnlocked
                ? `Você já atingiu 50%+ do XP. Marque sua presença agora!`
                : `Complete missões para acumular mais ${xpProgress.remainingXpToUnlock} XP e liberar o check-in.`}
            </p>
          </div>
        </div>

        {/* Lado Direito: Barra de XP com Marcador de 50% */}
        <div className="md:w-64 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-shinobi-gold" /> Meta 50% XP
            </span>
            <span className={xpProgress.isUnlocked ? 'text-emerald-400 font-bold' : 'text-shinobi-gold font-bold'}>
              {xpProgress.currentXp}/{xpProgress.totalTargetXp} XP ({xpProgress.progressPercent}%)
            </span>
          </div>

          <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            {/* Barra de Progresso Real */}
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                xpProgress.isUnlocked
                  ? 'bg-gradient-to-r from-shinobi-gold to-emerald-400'
                  : 'bg-gradient-to-r from-shinobi-crimson to-amber-500'
              }`}
              style={{ width: `${Math.min(100, xpProgress.progressPercent)}%` }}
            />
            {/* Marcador vertical demarcando os 50% */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/70 shadow"
              style={{ left: '50%' }}
              title="Patamar mínimo de 50% de XP"
            />
          </div>

          <div className="flex justify-between text-[9px] font-mono text-slate-500">
            <span>0 XP</span>
            <span className="text-slate-400 font-bold">50% ({xpProgress.target50PctXp} XP)</span>
            <span>100% ({xpProgress.totalTargetXp} XP)</span>
          </div>
        </div>
      </div>

      {/* Alerta Preventivo de Faltas Semanais (Regra das 2 Faltas na Mesma Semana) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {missedDaysInCurrentWeek === 0 ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
          )}
          <span className="text-slate-300 text-[11px]">
            Faltas na Semana {currentWeek}:{' '}
            <strong className={missedDaysInCurrentWeek === 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {missedDaysInCurrentWeek}/2
            </strong>
            {missedDaysInCurrentWeek === 0
              ? ' — Desafio 100% consistente nesta semana!'
              : ' — Cuidado: 2 faltas na mesma semana encerram o desafio e reiniciam em 1/66.'}
          </span>
        </div>

        <span className="text-[10px] font-mono text-slate-500 self-end sm:self-auto">
          Regra: máx 1 falta/semana
        </span>
      </div>

      {/* Notificação / Feedback temporário */}
      {feedbackMsg && (
        <div className="p-3 bg-shinobi-card/90 border border-shinobi-gold rounded-xl text-xs text-shinobi-gold flex items-center gap-2 animate-in fade-in shadow-lg">
          <Info className="w-4 h-4 flex-shrink-0 text-shinobi-gold" />
          <span>{feedbackMsg}</span>
        </div>
      )}
    </div>
  );
};
