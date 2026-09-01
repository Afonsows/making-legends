import React, { useState } from 'react';
import { ChallengeHabit } from '../../core/types';
import { 
  getRecent7Days, 
  calculateHabitStreaks, 
  generate6MonthHeatmap 
} from '../../state/useChallengeStore';
import { 
  Flame, 
  Trophy, 
  Trash2, 
  Calendar, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface ChallengeHabitCardProps {
  habit: ChallengeHabit;
  onToggleDay: (dateStr: string) => void;
  onDelete: () => void;
}

export const ChallengeHabitCard: React.FC<ChallengeHabitCardProps> = ({
  habit,
  onToggleDay,
  onDelete,
}) => {
  const [showHistory, setShowHistory] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const streaks = calculateHabitStreaks(habit.completedDates);
  const recent7Days = getRecent7Days(habit.completedDates);
  const heatmapWeeks = generate6MonthHeatmap(habit.completedDates);

  const accentColor = habit.color || '#10b981';

  return (
    <div className="liquid-glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden transition-all duration-300 group shadow-xl">
      {/* Filete de brilho especular e reflexo fosco */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 via-shinobi-gold/30 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/20 pointer-events-none" />

      {/* Parte Superior: Título, Badges e Régua dos 7 Dias */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        {/* Lado Esquerdo: Barra de destaque, Nome, Descrição e Badges */}
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Indicador Vertical Arredondado */}
          <div
            className="w-2 sm:w-2.5 h-10 sm:h-12 rounded-full flex-shrink-0 transition-all duration-300"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 14px ${accentColor}80`,
            }}
          />

          <div className="space-y-1 min-w-0">
            <h3 className="font-bold text-slate-100 text-base sm:text-lg tracking-tight truncate group-hover:text-shinobi-gold transition-colors">
              {habit.title}
            </h3>

            {habit.description && (
              <p className="text-xs text-slate-400 font-medium line-clamp-1">
                {habit.description}
              </p>
            )}

            {/* Badges de Ofensiva, Recorde e Alternância de Histórico */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {/* Badge: Ofensiva Atual */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-500/50 text-amber-400 text-[11px] font-mono font-bold shadow-sm">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{streaks.currentStreak} dias atuais</span>
              </div>

              {/* Badge: Recorde */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 text-[11px] font-mono font-bold shadow-sm">
                <Trophy className="w-3 h-3 text-emerald-400" />
                <span>Recorde: {streaks.bestStreak}</span>
              </div>

              {/* Botão Ocultar/Exibir Histórico */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors font-medium ml-1 flex items-center gap-1"
              >
                <span>{showHistory ? 'Ocultar Histórico' : 'Exibir Histórico'}</span>
                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito: Régua dos 7 Dias com Marcação Interativa */}
        <div className="self-end sm:self-center w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="inline-flex flex-col items-center">
            {/* Linha das Iniciais dos Dias da Semana */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] font-mono font-bold text-slate-400 w-full mb-1">
              {recent7Days.map((d) => (
                <div
                  key={`label_${d.date}`}
                  className={`px-1 ${d.isToday ? 'text-shinobi-gold font-extrabold tracking-wider' : 'text-slate-400'}`}
                >
                  {d.weekdayLabel}
                </div>
              ))}
            </div>

            {/* Linha dos Círculos de Marcação */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {recent7Days.map((d) => (
                <button
                  key={`day_${d.date}`}
                  type="button"
                  onClick={() => onToggleDay(d.date)}
                  title={`${d.date} (${d.weekdayLabel}): ${d.isCompleted ? 'Concluído ✓ (Clique para desmarcar)' : 'Pendente (Clique para marcar)'}`}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm transition-all duration-200 select-none active:scale-90 ${
                    d.isCompleted
                      ? 'bg-emerald-500 text-slate-950 border border-emerald-300 shadow-glow-jade/50 font-extrabold scale-105'
                      : d.isToday
                      ? 'bg-slate-900 border-2 border-shinobi-gold/80 text-shinobi-gold hover:bg-shinobi-gold/20 hover:scale-105 shadow-glow-gold/20 animate-pulse'
                      : 'bg-slate-950/90 border border-slate-700/80 text-slate-400 hover:border-slate-500 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {d.isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3.5] text-slate-950" />
                  ) : (
                    <span>{d.dayNumber}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Linha Dourada com Indicador em HOJE */}
            <div className="relative w-full h-1 mt-2 bg-gradient-to-r from-amber-900/30 via-amber-700/50 to-amber-500/80 rounded-full overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-white/90 shadow-[0_0_8px_#ffffff] rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Seção Inferior: Matriz de Calor de Consistência dos Últimos 6 Meses */}
      {showHistory && (
        <div className="mt-5 pt-4 border-t border-slate-800/80 relative z-10 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-mono font-bold text-[11px] text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-shinobi-gold" />
              <span>CONSISTÊNCIA NOS ÚLTIMOS 6 MESES</span>
            </div>

            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors font-medium p-1 rounded-lg hover:bg-rose-950/30"
              title="Excluir este hábito do desafio"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400" />
              <span>Excluir Hábito</span>
            </button>
          </div>

          {/* Matriz de Quadradinhos (26 semanas x 7 dias) */}
          <div className="overflow-x-auto pb-2 pt-1 -mx-1 px-1">
            <div className="flex items-center gap-1 min-w-[540px]">
              {heatmapWeeks.map((week, wIdx) => (
                <div key={`w_${wIdx}`} className="flex flex-col gap-1">
                  {week.map((day) => (
                    <div
                      key={`h_${day.date}`}
                      onMouseEnter={() => setHoveredDate(day.date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      onClick={() => !day.isInFuture && onToggleDay(day.date)}
                      title={`${day.date}: ${day.isCompleted ? 'Concluído ✓' : day.isInFuture ? 'Futuro' : 'Não realizado'}`}
                      className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-all cursor-pointer ${
                        day.isCompleted
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] hover:scale-125 hover:z-20'
                          : day.isToday
                          ? 'bg-amber-950/80 border border-shinobi-gold hover:scale-125'
                          : day.isInFuture
                          ? 'bg-slate-900/30 border border-slate-900 cursor-not-allowed'
                          : 'bg-slate-900/80 border border-slate-800/80 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legenda do Heatmap */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
            <span>{habit.completedDates.length} dias concluídos no histórico</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-900 border border-slate-800 inline-block" /> Vazio
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 inline-block" /> Concluído
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
