import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { 
  evaluateProtocolStatus, 
  getChallengeWeekNumber,
  getWeekDayRange
} from '../../core/streakEngine';
import { 
  X, 
  Map, 
  Check, 
  Lock, 
  AlertCircle, 
  Sparkles, 
  CalendarCheck,
  Flame,
  Award
} from 'lucide-react';

interface ChallengeMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChallengeMapModal: React.FC<ChallengeMapModalProps> = ({ isOpen, onClose }) => {
  const { profile, toggleDailyCheckIn } = useUserStore();
  const { missions } = useHabitStore();

  if (!isOpen) return null;

  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const { currentDay, activeChallenge, xpProgress } = protocolStatus;

  const phases = [
    { name: 'Fase 1: Despertar', range: 'Dias 1 a 22', start: 1, end: 22, color: 'text-rose-400', border: 'border-rose-500/40' },
    { name: 'Fase 2: Forja', range: 'Dias 23 a 44', start: 23, end: 44, color: 'text-amber-400', border: 'border-amber-500/40' },
    { name: 'Fase 3: Mestria', range: 'Dias 45 a 66', start: 45, end: 66, color: 'text-emerald-400', border: 'border-emerald-500/40' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-shinobi-gold/60 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] my-auto relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-shinobi-gold/20 border border-shinobi-gold/40 flex items-center justify-center text-shinobi-gold">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-base sm:text-lg flex items-center gap-2">
                <span>Mapa dos 66 Dias</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40">
                  Ciclo #{activeChallenge.cycleNumber || 1}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Jornada de transformação de hábitos • Neuroplasticidade & Maestria Shinobi
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
          {/* Resumo do Ciclo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs shadow-md">
            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Dia Atual</span>
              <span className="font-bold text-shinobi-gold font-mono text-base">
                Dia {currentDay} / 66
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Dias com Presença</span>
              <span className="font-bold text-emerald-400 font-mono text-base">
                {activeChallenge.daysCompleted || 0} dias
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Sequência Ativa</span>
              <span className="font-bold text-rose-400 font-mono text-base">
                {profile.currentStreak} dias
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">XP do Ciclo</span>
              <span className="font-bold text-amber-300 font-mono text-base">
                {activeChallenge.totalXpEarned || 0} XP
              </span>
            </div>
          </div>

          {/* Legenda dos Marcadores */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-[11px] text-slate-300 py-1">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-300 font-bold">✓</div>
              <span>Presente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-rose-500/30 border border-rose-400 flex items-center justify-center text-[10px] text-rose-300 font-bold">✗</div>
              <span>Falta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-amber-500/40 border-2 border-shinobi-gold animate-pulse" />
              <span>Dia de Hoje</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">🔒</div>
              <span>Futuro</span>
            </div>
          </div>

          {/* Grid dos 66 Dias Divididos pelas 3 Fases */}
          <div className="space-y-4">
            {phases.map((phase) => (
              <div key={phase.name} className={`p-4 rounded-2xl bg-slate-950/70 border ${phase.border} space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <h4 className={`font-cinzel text-xs sm:text-sm font-bold ${phase.color}`}>
                    {phase.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {phase.range}
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
                  {Array.from({ length: phase.end - phase.start + 1 }, (_, i) => {
                    const dayNum = phase.start + i;
                    const record = activeChallenge.checkIns[dayNum];
                    const isPast = dayNum < currentDay;
                    const isToday = dayNum === currentDay;
                    const isFuture = dayNum > currentDay;
                    const isChecked = Boolean(record?.checked);

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => {
                          if (isToday) {
                            toggleDailyCheckIn(dayNum);
                          }
                        }}
                        disabled={!isToday}
                        title={
                          isToday
                            ? xpProgress.isUnlocked
                              ? `Dia ${dayNum} (Hoje): Clique para marcar presença!`
                              : `Dia ${dayNum} (Hoje): Bloqueado (Requer 50% de XP)`
                            : isPast
                            ? isChecked
                              ? `Dia ${dayNum}: Presença confirmada ✓`
                              : `Dia ${dayNum}: Falta registrada ✗`
                            : `Dia ${dayNum}: Bloqueado (Futuro)`
                        }
                        className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center text-xs font-mono font-bold transition-all relative select-none ${
                          isToday
                            ? isChecked
                              ? 'bg-emerald-600 border-2 border-emerald-300 text-white shadow-glow-jade scale-105 z-10'
                              : xpProgress.isUnlocked
                              ? 'bg-amber-950/50 border-2 border-shinobi-gold text-shinobi-gold animate-pulse shadow-glow-gold hover:scale-105 z-10 cursor-pointer'
                              : 'bg-slate-900 border-2 border-slate-700 text-slate-400 hover:border-slate-500'
                            : isPast
                            ? isChecked
                              ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300'
                              : 'bg-rose-950/40 border border-rose-500/50 text-rose-400'
                            : 'bg-slate-900/60 border border-slate-800 text-slate-600 opacity-60'
                        }`}
                      >
                        <span className="text-[10px] sm:text-xs">
                          {isToday && isChecked ? (
                            '✓'
                          ) : isToday ? (
                            dayNum
                          ) : isPast ? (
                            isChecked ? '✓' : '✗'
                          ) : (
                            dayNum
                          )}
                        </span>

                        <span className="text-[8px] opacity-75">
                          D{dayNum}
                        </span>

                        {isToday && (
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-shinobi-gold rounded-full shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t-2 border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Regra semanal: 2 faltas na mesma semana encerram o ciclo e reiniciam em 1/66.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all ml-auto"
          >
            Fechar Mapa
          </button>
        </div>
      </div>
    </div>
  );
};
