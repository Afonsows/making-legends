import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useUIStore } from '../../state/useUIStore';
import { useTheme } from '../../theme/ThemeContext';
import { useTodayXp } from '../../state/challengeSelectors';
import { buildWeekSummary, getRecapWeek, WeekSummary } from '../../core/weeklySummary';
import { addDaysToDateString, getTodayString, getWeekKey, parseDate } from '../../core/dateUtils';
import { Sheet, pillarColor } from '../ui/kit';
import { Check, ChevronLeft, ChevronRight, Shield, TrendingDown, TrendingUp, X } from 'lucide-react';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const shortDate = (date: string) =>
  parseDate(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace(/\./g, '');

const formatNumber = (n: number) => n.toLocaleString('pt-BR');

function useWeekSummary(dateInWeek: string): WeekSummary {
  const profile = useUserStore((s) => s.profile);
  const missions = useHabitStore((s) => s.missions);
  const today = getTodayString();
  const todayXp = useTodayXp();
  return buildWeekSummary(profile, missions, dateInWeek, today, { completed: todayXp.isUnlocked });
}

/** Variação em relação à semana anterior, em palavras (nunca só por cor). */
const Change: React.FC<{ week: WeekSummary }> = ({ week }) => {
  if (week.xpChangePct === null) return <span className="text-[13px] text-ink3">sem semana anterior para comparar</span>;
  const up = week.xpChangePct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${up ? 'text-ok' : 'text-ink2'}`}>
      <Icon className="w-4 h-4" />
      {up ? '+' : '−'}
      {Math.abs(week.xpChangePct)}% de XP
      <span className="font-normal text-ink3">vs. semana anterior</span>
    </span>
  );
};

/** Corpo do resumo: números da semana, os sete dias e os destaques. */
const WeekBody: React.FC<{ week: WeekSummary }> = ({ week }) => {
  const { theme } = useTheme();
  const dayDelta = week.daysCompleted - week.previous.daysCompleted;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="t-num text-[34px] text-ink">
            {week.daysCompleted}
            <span className="text-lg text-ink3">/{week.isClosed ? 7 : week.daysElapsed}</span>
          </div>
          <div className="t-label mt-2.5">Dias cumpridos</div>
        </div>
        <div>
          <div className="t-num text-[34px] text-ink">{formatNumber(week.xp)}</div>
          <div className="t-label mt-2.5">XP na semana</div>
        </div>
      </div>

      <div className="mt-3.5">
        <Change week={week} />
      </div>

      <div className="grid grid-cols-7 gap-1.5 mt-5 pt-5 border-t border-line">
        {week.days.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-semibold tracking-wider ${day.state === 'today' ? 'text-ink' : 'text-ink3'}`}>
              {WEEKDAY_INITIALS[parseDate(day.date).getDay()]}
            </span>
            <span
              title={shortDate(day.date)}
              className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                day.state === 'done'
                  ? 'bg-ink border-ink text-bg'
                  : day.state === 'shield'
                  ? 'border-ok/50 text-ok'
                  : day.state === 'today'
                  ? 'border-accent text-ink'
                  : day.state === 'missed'
                  ? 'border-line text-ink3'
                  : 'border-transparent bg-surface2 text-ink3'
              } ${day.state === 'future' ? 'opacity-50' : ''}`}
            >
              {day.state === 'done' ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : day.state === 'shield' ? (
                <Shield className="w-3.5 h-3.5" />
              ) : (
                <span className="text-[11px] font-semibold tabular">{parseDate(day.date).getDate()}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      <dl className="mt-5 pt-1 border-t border-line divide-y divide-line text-sm">
        <div className="flex items-center justify-between gap-3 py-3">
          <dt className="text-ink2">Missões concluídas</dt>
          <dd className="font-semibold text-ink tabular">
            {week.missionsDone}
            <span className="font-normal text-ink3"> · antes {week.previous.missionsDone}</span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <dt className="text-ink2">Pilar da semana</dt>
          <dd className="font-semibold text-ink inline-flex items-center gap-2 min-w-0">
            {week.topPillar ? (
              <>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pillarColor(week.topPillar.id) }} />
                <span className="truncate">{theme.pillars[week.topPillar.id].categoryLabel}</span>
                <span className="font-normal text-ink3 tabular shrink-0">{formatNumber(week.topPillar.xp)} XP</span>
              </>
            ) : (
              <span className="font-normal text-ink3">—</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 pt-3">
          <dt className="text-ink2">Dias vs. semana anterior</dt>
          <dd className="font-semibold text-ink tabular">
            {dayDelta > 0 ? `+${dayDelta}` : dayDelta < 0 ? `−${Math.abs(dayDelta)}` : 'igual'}
            <span className="font-normal text-ink3"> · antes {week.previous.daysCompleted}</span>
          </dd>
        </div>
      </dl>
    </>
  );
};

/** Resumo semanal no Perfil, com navegação entre semanas. */
export const WeekSummaryCard: React.FC = () => {
  const today = getTodayString();
  const currentWeekStart = getWeekKey(today);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const week = useWeekSummary(weekStart);
  const isCurrent = weekStart === currentWeekStart;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2 -mt-1.5 mb-4">
        <button
          type="button"
          className="icon-btn -ml-2"
          onClick={() => setWeekStart(addDaysToDateString(weekStart, -7))}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-[15px] font-semibold text-ink tabular">
            {shortDate(week.weekStart)} – {shortDate(week.weekEnd)}
          </div>
          <div className="text-xs text-ink3">{isCurrent ? 'semana atual' : 'semana encerrada'}</div>
        </div>
        <button
          type="button"
          className="icon-btn -mr-2 disabled:opacity-30"
          disabled={isCurrent}
          onClick={() => setWeekStart(addDaysToDateString(weekStart, 7))}
          aria-label="Próxima semana"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <WeekBody week={week} />
    </div>
  );
};

/**
 * Aviso na tela "Hoje": aparece no domingo (semana fechando) e na segunda
 * (semana que acabou). Abre o resumo completo e pode ser dispensado.
 */
export const WeekRecapBanner: React.FC = () => {
  const recap = getRecapWeek(getTodayString());
  const week = useWeekSummary(recap?.dateInWeek || getTodayString());
  const dismissed = useUIStore((s) => s.dismissedWeekRecap);
  const dismiss = useUIStore((s) => s.dismissWeekRecap);
  const [isOpen, setIsOpen] = useState(false);

  if (!recap) return null;
  const key = `${week.weekStart}:${recap.kind}`;
  if (dismissed === key && !isOpen) return null;

  const title = recap.kind === 'closing' ? 'Sua semana está fechando' : 'Resumo da semana passada';

  return (
    <>
      <div className="card flex items-center gap-2 pl-5 pr-2 py-3.5">
        <button type="button" onClick={() => setIsOpen(true)} className="min-w-0 flex-1 text-left">
          <div className="t-label">{title}</div>
          <div className="text-[15px] font-semibold text-ink mt-2 tabular">
            {week.daysCompleted} de 7 dias · {formatNumber(week.xp)} XP
          </div>
          <div className="text-[13px] text-ink2 mt-0.5">Toque para ver o resumo completo</div>
        </button>
        <button type="button" className="icon-btn shrink-0" onClick={() => dismiss(key)} aria-label="Dispensar resumo semanal">
          <X className="w-4 h-4" />
        </button>
      </div>

      <Sheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={recap.kind === 'closing' ? 'Sua semana' : 'Semana passada'}
        subtitle={`${shortDate(week.weekStart)} – ${shortDate(week.weekEnd)}`}
      >
        <WeekBody week={week} />
      </Sheet>
    </>
  );
};
