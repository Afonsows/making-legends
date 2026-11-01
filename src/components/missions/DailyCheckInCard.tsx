import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { evaluateProtocolStatus, getWeekDayRange } from '../../core/streakEngine';
import { formatDateBR } from '../../core/dateUtils';
import { Map, History, Flame, ShieldCheck, ShieldAlert, Shield, Zap, Sparkles, CalendarClock, Skull } from 'lucide-react';

interface DailyCheckInCardProps {
  onOpenMap?: () => void;
  onOpenHistory?: () => void;
}

/** Selo circular do dia: anel de progresso de XP ou o carimbo 完 quando o dia foi cumprido. */
const DaySeal: React.FC<{ percentOfGoal: number; done: boolean; dayLabel: string }> = ({ percentOfGoal, done, dayLabel }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, percentOfGoal));
  return (
    <div className={`relative w-[86px] h-[86px] shrink-0 rounded-full ${done ? 'animate-chakra' : ''}`}>
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="rgba(2,6,23,0.85)" stroke="rgba(148,163,184,0.18)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={done ? '#FF7A1A' : 'url(#sealGradient)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.2,.8,.2,1)' }}
        />
        <defs>
          <linearGradient id="sealGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF1341" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {done ? (
          <span key="stamp" className="hanko-stamp animate-stamp text-3xl px-1.5 py-1 font-bold">完</span>
        ) : (
          <>
            <span className="font-mono text-lg font-bold text-slate-100 leading-none">{Math.round(pct * 100)}%</span>
            <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase tracking-wider">{dayLabel}</span>
          </>
        )}
      </div>
    </div>
  );
};

export const DailyCheckInCard: React.FC<DailyCheckInCardProps> = ({ onOpenMap, onOpenHistory }) => {
  const { profile, openChallengeMapModal, openChallengeHistoryModal, openStartChallengeModal } = useUserStore();
  const { missions } = useHabitStore();
  const { getPhaseInfo } = useTheme();

  const status = evaluateProtocolStatus(profile, missions);
  const { xpProgress } = status;
  const goal = Math.max(1, xpProgress.target50PctXp);
  const percentOfGoal = xpProgress.currentXp / goal;
  const handleOpenMap = onOpenMap || openChallengeMapModal;
  const handleOpenHistory = onOpenHistory || openChallengeHistoryModal;
  const cycle = profile.activeChallenge && profile.activeChallenge.status === 'active' ? profile.activeChallenge : undefined;

  const dailyBlock = (
    <div className="flex items-center gap-4">
      <DaySeal percentOfGoal={percentOfGoal} done={xpProgress.isUnlocked} dayLabel="da meta" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="text-sm font-bold text-slate-100">
          {xpProgress.isUnlocked ? 'Dia Cumprido!' : xpProgress.totalTargetXp === 0 ? 'Crie missões para começar' : 'Meta do dia em andamento'}
        </div>
        <p className="text-xs text-slate-400 leading-snug">
          {xpProgress.isUnlocked
            ? `Presença garantida com ${xpProgress.currentXp} XP. Cada missão a mais fortalece seu chakra e causa dano no Duelo.`
            : xpProgress.totalTargetXp === 0
            ? 'Adicione missões diárias para definir sua meta.'
            : `Faltam ${xpProgress.remainingXpToUnlock} XP para cumprir o dia (50% de ${xpProgress.totalTargetXp} XP). A presença é marcada automaticamente.`}
        </p>
        <div className="relative w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              xpProgress.isUnlocked ? 'bg-gradient-to-r from-shinobi-orange to-amber-300' : 'bg-gradient-to-r from-shinobi-crimson to-shinobi-orange'
            }`}
            style={{ width: `${xpProgress.progressPercent}%` }}
          />
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/80" style={{ left: '50%' }} title="Meta mínima: 50% do XP" />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>{xpProgress.currentXp} XP</span>
          <span className="text-slate-300">meta {xpProgress.target50PctXp}</span>
          <span>{xpProgress.totalTargetXp} XP</span>
        </div>
      </div>
    </div>
  );

  // ── Sem desafio ativo ─────────────────────────────────────
  if (!cycle) {
    const nextCycleNum = (profile.challengeHistory?.length || 0) + 1;
    return (
      <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-orange/50 p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute -top-6 right-2 font-kanji text-[110px] leading-none text-white/[0.04] select-none pointer-events-none">挑</div>
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <span className="inline-block text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-shinobi-orange/15 text-shinobi-orange font-bold border border-shinobi-orange/40">
              Ciclo #{nextCycleNum} • aguardando início
            </span>
            <h2 className="font-cinzel text-lg sm:text-xl text-slate-100 mt-2 flex items-center gap-2">
              <Flame className="w-5 h-5 text-shinobi-orange" />
              Pronto para um novo desafio?
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Escolha suas missões, a duração (21, 30, 66 ou 90 dias) e jure seguir o caminho ninja. Sua sequência e seus Dias Cumpridos continuam contando mesmo sem desafio.
            </p>
          </div>
          <button
            onClick={handleOpenHistory}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Histórico</span>
          </button>
        </div>

        <div className="relative z-10 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">{dailyBlock}</div>

        <button
          type="button"
          onClick={openStartChallengeModal}
          className="relative z-10 w-full py-3.5 bg-gradient-to-r from-shinobi-orange via-amber-500 to-shinobi-crimson hover:brightness-110 text-slate-950 font-extrabold text-sm rounded-2xl shadow-glow-orange transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Personalizar e Iniciar Desafio
        </button>
      </div>
    );
  }

  // ── Desafio agendado (começa no futuro) ───────────────────
  if (status.isScheduled) {
    return (
      <div className="pergaminho-bg rounded-2xl border-2 border-cyan-500/40 p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/40">
              {cycle.title}
            </span>
            <h2 className="font-cinzel text-lg text-slate-100 mt-2 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-cyan-300" />
              Começa em {status.daysUntilStart} {status.daysUntilStart === 1 ? 'dia' : 'dias'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Dia 1 em {formatDateBR(cycle.startDate)}. Até lá, use os dias para ajustar suas missões — eles ainda contam para a sua sequência.
            </p>
          </div>
        </div>
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">{dailyBlock}</div>
      </div>
    );
  }

  // ── Desafio em andamento ──────────────────────────────────
  const phase = getPhaseInfo(status.currentDay, status.targetDays);
  const { startDay, endDay } = getWeekDayRange(status.currentWeek, status.targetDays);
  const allowed = status.allowedMissesPerWeek;
  const missed = status.missedDaysInCurrentWeek;
  const atRisk = missed >= allowed;

  return (
    <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-orange/50 p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      <div className="absolute -top-8 right-0 font-kanji text-[120px] leading-none text-white/[0.035] select-none pointer-events-none">
        {status.phaseIndex === 1 ? '覚' : status.phaseIndex === 2 ? '鍛' : '極'}
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-shinobi-orange/15 text-shinobi-orange font-bold border border-shinobi-orange/40 truncate max-w-[230px]">
              {cycle.title || `Desafio ${status.targetDays} Dias`}
            </span>
            {cycle.isEliteMode && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                <Skull className="w-3 h-3" /> ELITE
              </span>
            )}
          </div>
          <h2 className="font-cinzel text-xl sm:text-2xl text-slate-100">
            Dia {status.currentDay} <span className="text-slate-500 text-base">/ {status.targetDays}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fase {status.phaseIndex}: <strong className="text-amber-300">{phase.name}</strong> ({phase.daysRange}) — {status.totalDaysRemaining}{' '}
            {status.totalDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleOpenMap}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-shinobi-orange border border-shinobi-orange/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Map className="w-3.5 h-3.5" />
            Mapa
          </button>
          <button
            onClick={handleOpenHistory}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            Ciclos
          </button>
        </div>
      </div>

      {/* Barra de progresso da jornada */}
      <div className="relative z-10">
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-shinobi-crimson via-shinobi-orange to-amber-300 rounded-full transition-all duration-700"
            style={{ width: `${status.protocolProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">{dailyBlock}</div>

      {/* Regras da semana */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${atRisk ? 'bg-rose-950/40 border-rose-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
          {missed === 0 ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className={`w-4 h-4 shrink-0 ${atRisk ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
          )}
          <span className="text-slate-300">
            Semana {status.currentWeek} (dias {startDay}–{endDay}): <strong className={missed === 0 ? 'text-emerald-400' : atRisk ? 'text-rose-300' : 'text-amber-300'}>{missed} {missed === 1 ? 'falta' : 'faltas'}</strong>
            {allowed === 0
              ? ' — Modo Elite: qualquer falta encerra o desafio.'
              : atRisk
              ? ' — mais uma falta nesta semana encerra o desafio!'
              : ` de ${allowed} tolerada.`}
          </span>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-slate-950/60 border-slate-800">
          <Shield className={`w-4 h-4 shrink-0 ${profile.weeklyShieldsRemaining > 0 ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="text-slate-300">
            {profile.isHardModeEnabled
              ? 'Sem Escudo de Chakra no Modo Elite (+20% XP).'
              : <>Escudo de Chakra: <strong className="text-emerald-300">{profile.weeklyShieldsRemaining}/{profile.weeklyShieldsMax}</strong> — protege sua sequência de 1 falta.</>}
          </span>
        </div>
      </div>

      {xpProgress.isUnlocked && (
        <div className="relative z-10 flex items-center gap-2 text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/20 rounded-xl px-3 py-2">
          <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          Presença do Dia {status.currentDay} confirmada. Volte amanhã para manter a chama acesa.
        </div>
      )}
    </div>
  );
};
