import React, { useState } from 'react';
import { ChallengeHabit } from '../../core/types';
import { getRecent7Days, calculateHabitStreaks, generateChallengeDays } from '../../state/useChallengeStore';
import { Bar, Menu } from '../ui/kit';
import { Check, ChevronDown, Flame, Pencil, Trash2 } from 'lucide-react';

interface ChallengeHabitCardProps {
  habit: ChallengeHabit;
  targetDays?: number;
  startDate?: string;
  onToggleDay: (dateStr: string) => void;
  onDelete: () => void;
  onEdit?: (updates: { title: string; description?: string; color?: string }) => void;
  forceCollapseHistory?: boolean;
}

/**
 * Um hábito dentro de um desafio: a semana em uma linha (toque para marcar),
 * a sequência e, sob demanda, o mapa completo de todos os dias.
 */
export const ChallengeHabitCard: React.FC<ChallengeHabitCardProps> = ({
  habit,
  targetDays = 66,
  startDate,
  onToggleDay,
  onDelete,
  onEdit,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(habit.title);
  const [editDesc, setEditDesc] = useState(habit.description || '');
  const [editColor, setEditColor] = useState(habit.color || '#10b981');

  const streaks = calculateHabitStreaks(habit.completedDates);
  const recent7Days = getRecent7Days(habit.completedDates);
  const challengeDays = generateChallengeDays(targetDays, startDate, habit.completedDates);
  const completedCount = challengeDays.filter((d) => d.isCompleted).length;
  const progressPercent = Math.min(100, Math.round((completedCount / targetDays) * 100));
  const accentColor = habit.color || '#10b981';

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    onEdit?.({ title: editTitle.trim(), description: editDesc.trim(), color: editColor });
    setIsEditing(false);
  };

  return (
    <div className="card p-4">
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="space-y-2.5">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Nome do hábito"
            className="field"
            required
            autoFocus
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            className="field"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-[13px] text-ink2 mr-auto">
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-9 h-9 rounded-lg bg-transparent border border-line cursor-pointer"
                aria-label="Cor do hábito"
              />
              Cor
            </label>
            <button type="button" onClick={() => setIsEditing(false)} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button type="submit" className="btn btn-solid btn-sm">
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <span className="w-2 h-2 rounded-full shrink-0 mt-[7px]" style={{ background: accentColor }} />
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-semibold text-ink leading-snug">{habit.title}</h4>
            {habit.description && <p className="text-[13px] text-ink2 mt-0.5 leading-snug line-clamp-2">{habit.description}</p>}
          </div>
          <div className="-mt-2 -mr-2">
            <Menu
              label={`Opções de ${habit.title}`}
              items={[
                { label: 'Editar hábito', icon: Pencil, onSelect: () => setIsEditing(true), hidden: !onEdit },
                { label: 'Excluir hábito', icon: Trash2, onSelect: onDelete, danger: true },
              ]}
            />
          </div>
        </div>
      )}

      {/* Últimos 7 dias — toque para marcar */}
      <div className="grid grid-cols-7 gap-1.5 mt-4">
        {recent7Days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-semibold tracking-wider ${d.isToday ? 'text-ink' : 'text-ink3'}`}>
              {d.isToday ? 'HOJE' : d.weekdayLabel}
            </span>
            <button
              type="button"
              onClick={() => onToggleDay(d.date)}
              aria-pressed={d.isCompleted}
              aria-label={`${d.date}: ${d.isCompleted ? 'concluído' : 'pendente'}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors touch-manipulation ${
                d.isCompleted
                  ? 'bg-ink border-ink text-bg'
                  : d.isToday
                  ? 'border-accent text-ink'
                  : 'border-line text-ink3 hover:border-ink3'
              }`}
            >
              {d.isCompleted ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : (
                <span className="text-[11px] font-semibold tabular">{d.dayNumber}</span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Progresso no desafio */}
      <div className="mt-4">
        <Bar value={progressPercent} />
        <div className="flex items-center justify-between gap-3 mt-2.5 text-[13px] text-ink2">
          <span className="inline-flex items-center gap-1.5 tabular">
            <Flame className={`w-3.5 h-3.5 ${streaks.currentStreak > 0 ? 'text-accent' : 'text-ink3'}`} />
            {streaks.currentStreak} {streaks.currentStreak === 1 ? 'dia' : 'dias'}
            <span className="text-ink3">· recorde {streaks.bestStreak}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            className="inline-flex items-center gap-1 font-semibold text-ink2 hover:text-ink tabular"
          >
            {completedCount}/{targetDays}
            <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mapa completo dos dias do desafio */}
      {showHistory && (
        <div
          className="grid gap-1 mt-3 animate-in fade-in"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(1.5rem, 1fr))' }}
        >
          {challengeDays.map((d) => (
            <button
              key={d.date}
              type="button"
              disabled={d.isInFuture}
              onClick={() => onToggleDay(d.date)}
              title={`Dia ${d.dayNumber} · ${d.date}`}
              aria-label={`Dia ${d.dayNumber}: ${d.isCompleted ? 'concluído' : d.isInFuture ? 'futuro' : 'pendente'}`}
              className={`aspect-square rounded-md text-[9px] font-semibold tabular flex items-center justify-center border ${
                d.isCompleted
                  ? 'bg-ink border-ink text-bg'
                  : d.isToday
                  ? 'border-accent text-ink'
                  : d.isInFuture
                  ? 'border-line text-ink3 opacity-50'
                  : 'border-transparent bg-surface2 text-ink3'
              }`}
            >
              {d.dayNumber}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
