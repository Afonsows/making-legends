import React, { useState } from 'react';
import { Mission, UserChallenge } from '../../core/types';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { calculateHabitStreaks } from '../../state/useChallengeStore';
import { addDaysToDateString, formatDateBR, getTodayString, parseDate } from '../../core/dateUtils';
import { lastCountedDate } from '../../core/challenges';
import { Menu, pillarColor } from '../ui/kit';
import { Check, Flame, Pencil, Trash2 } from 'lucide-react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface ChallengeHabitCardProps {
  habit: Mission;
  challenge: UserChallenge;
  editable: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

/**
 * Um hábito dentro do desafio: os últimos 7 dias do desafio (toque para marcar
 * ou corrigir), a sequência e quantos dias foram feitos.
 */
export const ChallengeHabitCard: React.FC<ChallengeHabitCardProps> = ({ habit, challenge, editable, onEdit, onRemove }) => {
  const toggleMissionOnDate = useHabitStore((s) => s.toggleMissionOnDate);
  const { getPillar } = useTheme();
  const [notice, setNotice] = useState<string | null>(null);

  const today = getTodayString();
  const last = lastCountedDate(challenge);
  const anchor = today > last ? last : today;
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateString(anchor, i - 6));
  const inChallenge = (habit.completedDates || []).filter((d) => d >= challenge.startDate && d <= last);
  const streaks = calculateHabitStreaks(inChallenge);
  const pillar = getPillar(habit.pillarId);

  const toggle = (date: string) => {
    const res = toggleMissionOnDate(habit.id, date);
    if (!res.success && res.reason) {
      setNotice(res.reason);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span className="w-2 h-2 rounded-full shrink-0 mt-[7px]" style={{ background: pillarColor(habit.pillarId) }} />
        <div className="min-w-0 flex-1">
          <h4 className="text-[15px] font-semibold text-ink leading-snug">{habit.title}</h4>
          <p className="text-xs text-ink2 mt-0.5">
            {pillar.categoryLabel} · {habit.xpReward} XP
          </p>
        </div>
        {editable && (
          <div className="-mt-2 -mr-2">
            <Menu
              label={`Opções de ${habit.title}`}
              items={[
                { label: 'Editar hábito', icon: Pencil, onSelect: onEdit },
                { label: 'Retirar do desafio', icon: Trash2, onSelect: onRemove, danger: true },
              ]}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 mt-4">
        {days.map((date) => {
          const done = (habit.completedDates || []).includes(date);
          const outside = date < challenge.startDate || date > last;
          const isToday = date === today;
          return (
            <div key={date} className="flex flex-col items-center gap-1.5">
              <span className={`text-[10px] font-semibold tracking-wider ${isToday ? 'text-ink' : 'text-ink3'}`}>
                {isToday ? 'HOJE' : WEEKDAYS[parseDate(date).getDay()]}
              </span>
              <button
                type="button"
                disabled={outside || !editable}
                onClick={() => toggle(date)}
                aria-pressed={done}
                aria-label={`${formatDateBR(date)}: ${done ? 'feito' : outside ? 'fora do desafio' : 'pendente'}`}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors touch-manipulation ${
                  done
                    ? 'bg-ink border-ink text-bg'
                    : outside
                    ? 'border-transparent text-ink3 opacity-30'
                    : isToday
                    ? 'border-accent text-ink'
                    : 'border-line text-ink3 hover:border-ink3'
                }`}
              >
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : <span className="text-[11px] font-semibold tabular">{parseDate(date).getDate()}</span>}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mt-3.5 text-[13px] text-ink2">
        <span className="inline-flex items-center gap-1.5 tabular">
          <Flame className={`w-3.5 h-3.5 ${streaks.currentStreak > 0 ? 'text-accent' : 'text-ink3'}`} />
          {streaks.currentStreak} {streaks.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
          <span className="text-ink3">· recorde {streaks.bestStreak}</span>
        </span>
        <span className="tabular font-semibold">
          {inChallenge.length}
          <span className="text-ink3 font-normal"> {inChallenge.length === 1 ? 'dia feito' : 'dias feitos'}</span>
        </span>
      </div>
      {notice && <p className="text-[13px] text-accent mt-2">{notice}</p>}
    </div>
  );
};
