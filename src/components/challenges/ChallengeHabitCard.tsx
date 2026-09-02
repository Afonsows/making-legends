import React, { useState } from 'react';
import { ChallengeHabit } from '../../core/types';
import { 
  getRecent7Days, 
  calculateHabitStreaks, 
  generateChallengeDays,
  ChallengeGridDay 
} from '../../state/useChallengeStore';
import { 
  Flame, 
  Trophy, 
  Trash2, 
  Calendar, 
  Check, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';

interface ChallengeHabitCardProps {
  habit: ChallengeHabit;
  targetDays?: number;
  startDate?: string;
  onToggleDay: (dateStr: string) => void;
  onDelete: () => void;
}

export const ChallengeHabitCard: React.FC<ChallengeHabitCardProps> = ({
  habit,
  targetDays = 66,
  startDate,
  onToggleDay,
  onDelete,
}) => {
  const [showHistory, setShowHistory] = useState(true);

  const streaks = calculateHabitStreaks(habit.completedDates);
  const recent7Days = getRecent7Days(habit.completedDates);
  const challengeDays = generateChallengeDays(targetDays, startDate, habit.completedDates);

  const completedCount = challengeDays.filter((d) => d.isCompleted).length;
  const progressPercent = Math.min(100, Math.round((completedCount / targetDays) * 100));

  const accentColor = habit.color || '#10b981';

  return (
    <div className="liquid-glass-card rounded-2xl p-4 sm:p-4.5 relative overflow-hidden transition-all duration-300 group shadow-lg flex flex-col justify-between space-y-3.5">
      {/* Filete de brilho especular e reflexo fosco */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 via-shinobi-gold/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/20 pointer-events-none" />

      {/* Linha Lateral de Acento */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 transition-all duration-300 group-hover:w-2"
        style={{
          backgroundColor: accentColor,
          boxShadow: `0 0 10px ${accentColor}80`,
        }}
      />

      {/* Parte Superior: Título, Badges e Régua dos 7 Dias */}
      <div className="space-y-2.5 relative z-10 pl-1.5">
        {/* Topo do Card: Nome e Subtítulo */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight truncate group-hover:text-shinobi-gold transition-colors">
              {habit.title}
            </h3>

            {habit.description && (
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {habit.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors flex-shrink-0"
            title="Excluir este hábito do desafio"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Badges de Ofensiva, Recorde e Alternância de Histórico */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Badge: Ofensiva Atual */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/50 text-amber-400 text-[10px] font-mono font-bold shadow-sm">
            <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span>{streaks.currentStreak} d atuais</span>
          </div>

          {/* Badge: Recorde */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold shadow-sm">
            <Trophy className="w-2.5 h-2.5 text-emerald-400" />
            <span>Rec: {streaks.bestStreak}</span>
          </div>

          {/* Botão Ocultar/Exibir Histórico */}
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors font-medium ml-auto flex items-center gap-0.5"
          >
            <span>{showHistory ? 'Ocultar' : 'Histórico'}</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Régua dos 7 Dias com Marcação Interativa */}
        <div className="pt-1">
          <div className="flex flex-col items-center w-full">
            {/* Linha das Iniciais dos Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold text-slate-400 w-full mb-1">
              {recent7Days.map((d) => (
                <div
                  key={`label_${d.date}`}
                  className={`px-0.5 ${d.isToday ? 'text-shinobi-gold font-extrabold' : 'text-slate-400'}`}
                >
                  {d.weekdayLabel}
                </div>
              ))}
            </div>

            {/* Linha dos Círculos de Marcação */}
            <div className="grid grid-cols-7 gap-1 w-full">
              {recent7Days.map((d) => (
                <button
                  key={`day_${d.date}`}
                  type="button"
                  onClick={() => onToggleDay(d.date)}
                  title={`${d.date} (${d.weekdayLabel}): ${d.isCompleted ? 'Concluído ✓' : 'Pendente'}`}
                  className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] transition-all duration-200 select-none active:scale-90 ${
                    d.isCompleted
                      ? 'bg-emerald-500 text-slate-950 border border-emerald-300 shadow-glow-jade/50 font-extrabold scale-105'
                      : d.isToday
                      ? 'bg-slate-900 border-2 border-shinobi-gold/80 text-shinobi-gold hover:bg-shinobi-gold/20 hover:scale-105 shadow-glow-gold/20 animate-pulse'
                      : 'bg-slate-950/90 border border-slate-700/80 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {d.isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3.5] text-slate-950" />
                  ) : (
                    <span>{d.dayNumber}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Linha Dourada com Indicador em HOJE */}
            <div className="relative w-full h-0.5 mt-1.5 bg-gradient-to-r from-amber-900/30 via-amber-700/50 to-amber-500/80 rounded-full overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/90 shadow-[0_0_6px_#ffffff] rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Quadrinhos Pequeninhos com o Total do Desafio (ex: 66 quadrinhos) */}
      {showHistory && (
        <div className="pt-2.5 border-t border-slate-800/80 relative z-10 space-y-2 animate-in fade-in duration-200 pl-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 font-mono font-bold text-[11px] text-slate-300">
              <Calendar className="w-3 h-3 text-shinobi-gold" />
              <span>CONSISTÊNCIA</span>
              <span className="px-1.5 py-0.2 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40 text-[10px] font-mono font-bold">
                {completedCount}/{targetDays}
              </span>
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {progressPercent}%
            </span>
          </div>

          {/* Matriz de Quadrinhos Pequeninhos (ex: 66 quadrinhos pequenininhos) */}
          <div className="flex flex-wrap gap-1 items-center">
            {challengeDays.map((day: ChallengeGridDay) => (
              <button
                key={`cd_${day.dayNumber}_${day.date}`}
                type="button"
                onClick={() => !day.isInFuture && onToggleDay(day.date)}
                disabled={day.isInFuture}
                title={`Dia ${day.dayNumber} (${day.date}): ${
                  day.isCompleted
                    ? 'Concluído ✓'
                    : day.isToday
                    ? 'Hoje (Pendente)'
                    : day.isPast
                    ? 'Pendente'
                    : 'Futuro'
                }`}
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[2.5px] transition-all cursor-pointer ${
                  day.isCompleted
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] hover:scale-125 z-10'
                    : day.isToday
                    ? 'bg-amber-950/80 border border-shinobi-gold hover:scale-125'
                    : day.isInFuture
                    ? 'bg-slate-950/40 border border-slate-900/60 opacity-40 cursor-not-allowed'
                    : 'bg-slate-900/90 border border-slate-800/80 hover:border-slate-600 hover:bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Legenda Compacta */}
          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-0.5">
            <span>{completedCount} de {targetDays} dias</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-[1.5px] bg-slate-900 border border-slate-800 inline-block" /> Vazio
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-[1.5px] bg-amber-950 border border-shinobi-gold inline-block" /> Hoje
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-[1.5px] bg-emerald-500 inline-block" /> Concluído
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
