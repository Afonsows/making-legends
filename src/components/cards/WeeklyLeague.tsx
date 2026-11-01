import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { getTodayString, getWeekKey, addDaysToDateString, daysBetween } from '../../core/dateUtils';
import { Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const DIVISIONS = [
  { min: 7, name: 'Liga Kage', kanji: '影', color: '#FF7A1A' },
  { min: 6, name: 'Liga Diamante', kanji: '剛', color: '#22d3ee' },
  { min: 5, name: 'Liga Ouro', kanji: '金', color: '#eab308' },
  { min: 3, name: 'Liga Prata', kanji: '銀', color: '#cbd5e1' },
  { min: 1, name: 'Liga Bronze', kanji: '銅', color: '#d97706' },
  { min: 0, name: 'Liga Aprendiz', kanji: '卵', color: '#64748b' },
];

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/**
 * Liga semanal honesta: a divisão depende dos Dias Cumpridos na semana
 * e o "rival" é você mesmo na semana anterior.
 */
export const WeeklyLeague: React.FC = () => {
  const { profile } = useUserStore();
  const today = getTodayString();
  const weekStart = getWeekKey(today);
  const lastWeekStart = addDaysToDateString(weekStart, -7);
  const elapsed = daysBetween(weekStart, today) + 1; // 1..7

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysToDateString(weekStart, i);
    return { date, rec: profile.dayLog?.[date], isFuture: date > today, isToday: date === today };
  });
  const lastWeek = Array.from({ length: 7 }, (_, i) => profile.dayLog?.[addDaysToDateString(lastWeekStart, i)]);

  const daysDone = week.filter((d) => d.rec?.completed).length;
  const xpThisWeek = week.reduce((acc, d) => acc + (d.rec?.xpEarned || 0), 0);
  const xpLastWeekSamePoint = lastWeek.slice(0, elapsed).reduce((acc, r) => acc + (r?.xpEarned || 0), 0);
  const xpLastWeekTotal = lastWeek.reduce((acc, r) => acc + (r?.xpEarned || 0), 0);
  const lastWeekDays = lastWeek.filter((r) => r?.completed).length;

  const division = DIVISIONS.find((d) => daysDone >= d.min)!;
  const next = [...DIVISIONS].reverse().find((d) => d.min > daysDone);
  const diff = xpThisWeek - xpLastWeekSamePoint;
  const daysLeft = 7 - elapsed;

  return (
    <div className="bg-shinobi-card washi-texture rounded-2xl border border-shinobi-border p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-shinobi-border pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-shinobi-orange/15 text-shinobi-orange border border-shinobi-orange/40">
            SEMANA DE {weekStart.split('-').reverse().slice(0, 2).join('/')}
          </span>
          <h3 className="font-cinzel text-base text-slate-100 mt-1.5 flex items-center gap-2">
            <Medal className="w-5 h-5" style={{ color: division.color }} />
            {division.name}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Sua divisão sobe com os Dias Cumpridos da semana.{' '}
            {next ? `Mais ${next.min - daysDone} para a ${next.name}.` : 'Divisão máxima alcançada!'}
          </p>
        </div>
        <div className="font-kanji text-5xl leading-none shrink-0" style={{ color: division.color }}>
          {division.kanji}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d, i) => (
          <div key={d.date} className="text-center space-y-1">
            <div className={`text-[10px] font-mono ${d.isToday ? 'text-shinobi-orange font-bold' : 'text-slate-500'}`}>{WEEKDAYS[i]}</div>
            <div
              className={`h-9 rounded-lg border flex items-center justify-center text-sm ${
                d.rec?.completed
                  ? 'bg-shinobi-orange/20 border-shinobi-orange/60 text-shinobi-orange font-kanji'
                  : d.isFuture
                  ? 'bg-slate-900/40 border-slate-800 text-slate-700'
                  : d.isToday
                  ? 'bg-slate-900 border-dashed border-shinobi-orange/50 text-slate-500'
                  : 'bg-rose-950/30 border-rose-900/50 text-rose-500/70'
              }`}
            >
              {d.rec?.completed ? '完' : d.isFuture || d.isToday ? '·' : '✗'}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-shinobi-bg border border-shinobi-orange/40">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Você (esta semana)</div>
          <div className="font-mono font-bold text-lg text-shinobi-orange">{xpThisWeek} XP</div>
          <div className="text-[10px] text-slate-400">{daysDone} dias cumpridos</div>
        </div>
        <div className="p-3 rounded-xl bg-shinobi-bg border border-shinobi-border">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Seu eu da semana passada</div>
          <div className="font-mono font-bold text-lg text-slate-300">{xpLastWeekTotal} XP</div>
          <div className="text-[10px] text-slate-400">{lastWeekDays} dias cumpridos</div>
        </div>
      </div>

      <div
        className={`flex items-center gap-2 p-3 rounded-xl text-xs border ${
          diff > 0 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : diff < 0 ? 'bg-rose-950/30 border-rose-500/40 text-rose-200' : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}
      >
        {diff > 0 ? <TrendingUp className="w-4 h-4 shrink-0" /> : diff < 0 ? <TrendingDown className="w-4 h-4 shrink-0" /> : <Minus className="w-4 h-4 shrink-0" />}
        <span>
          {diff > 0
            ? `Você está ${diff} XP à frente do seu ritmo da semana passada. Continue!`
            : diff < 0
            ? `Você está ${Math.abs(diff)} XP atrás do seu ritmo da semana passada. Ainda ${daysLeft === 0 ? 'há hoje' : `há ${daysLeft + 1} dias`} para virar o jogo.`
            : 'Empate com o seu ritmo da semana passada.'}
        </span>
      </div>
    </div>
  );
};
