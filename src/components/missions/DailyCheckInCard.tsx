import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useTodayXp } from '../../state/challengeSelectors';
import { addDaysToDateString, formatDateBR, getTodayString, parseDate } from '../../core/dateUtils';
import { Menu, MenuItem, Ring } from '../ui/kit';
import { Check, Flame, Shield } from 'lucide-react';
import { DailyXpProgress } from '../../core/dayLog';
import { UserProfile } from '../../core/types';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Meta do dia: anel + XP feito / XP necessário para o dia contar na sequência. */
const DayGoal: React.FC<{ xp: DailyXpProgress }> = ({ xp }) => {
  const goal = Math.max(1, xp.target50PctXp);
  const ratio = xp.currentXp / goal;
  const done = xp.isUnlocked;
  const empty = xp.totalTargetXp === 0;

  return (
    <div className="flex items-center gap-4">
      <Ring value={ratio} size={76} stroke={6} color={done ? 'rgb(var(--ok))' : 'rgb(var(--accent))'}>
        {done ? (
          <Check key="done" className="w-7 h-7 text-ok animate-pop" strokeWidth={2.75} />
        ) : (
          <span className="t-num text-[19px] text-ink">
            {Math.round(Math.min(1, ratio) * 100)}
            <span className="text-[11px] text-ink3">%</span>
          </span>
        )}
      </Ring>
      <div className="min-w-0 flex-1">
        <div className="t-label">Meta de hoje</div>
        <div className="t-num text-[26px] text-ink mt-2">
          {xp.currentXp}
          <span className="text-sm text-ink3 font-semibold"> / {xp.target50PctXp} XP</span>
        </div>
        <p className="text-[13px] text-ink2 mt-1.5 leading-snug">
          {empty
            ? 'Sem hábitos para hoje. Comece um desafio para definir a meta.'
            : done
            ? 'Dia garantido na sequência. O que vier a mais é bônus.'
            : `Faltam ${xp.remainingXpToUnlock} XP (metade do previsto) para o dia contar na sequência.`}
        </p>
      </div>
    </div>
  );
};

/** Últimos 7 dias da sequência: cumprido, protegido por escudo, perdido ou hoje. */
const WeekStrip: React.FC<{ profile: UserProfile; todayDone: boolean }> = ({ profile, todayDone }) => {
  const today = getTodayString();
  const shielded = new Set(profile.shieldedDates || []);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDateString(today, i - 6));

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((date) => {
        const record = profile.dayLog?.[date];
        const isToday = date === today;
        const done = isToday ? todayDone : Boolean(record?.completed);
        const isShielded = !done && shielded.has(date);
        const missed = !isToday && !done && !isShielded && Boolean(record?.closed) && record!.xpTarget > 0;
        const label = isToday ? 'Hoje' : done ? 'Cumprido' : isShielded ? 'Protegido por escudo' : missed ? 'Não cumprido' : 'Sem registro';

        return (
          <div key={date} className="flex flex-col items-center gap-1.5" title={`${formatDateBR(date)} — ${label}`}>
            <span className={`text-[10px] font-semibold tracking-wider ${isToday ? 'text-ink' : 'text-ink3'}`}>
              {WEEKDAY_INITIALS[parseDate(date).getDay()]}
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                done
                  ? 'bg-ink border-ink text-bg'
                  : isShielded
                  ? 'border-ok/50 text-ok'
                  : isToday
                  ? 'border-accent text-ink'
                  : missed
                  ? 'border-line text-ink3'
                  : 'border-transparent bg-surface2 text-ink3'
              }`}
            >
              {done ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : isShielded ? (
                <Shield className="w-3.5 h-3.5" />
              ) : (
                <span className="text-[11px] font-semibold tabular">{parseDate(date).getDate()}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Cartão de abertura da tela "Hoje": a meta do dia (metade do XP de todos os
 * hábitos que valem hoje), a sequência e a semana. Os desafios vêm abaixo, cada um com os seus hábitos.
 */
export const DailyCheckInCard: React.FC<{ menuItems?: MenuItem[] }> = ({ menuItems }) => {
  const profile = useUserStore((s) => s.profile);
  const xp = useTodayXp();

  return (
    <section className="card p-5 space-y-5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <DayGoal xp={xp} />
        </div>
        {menuItems && menuItems.length > 0 && (
          <div className="-mt-2 -mr-2">
            <Menu label="Opções do dia" items={menuItems} />
          </div>
        )}
      </div>
      <div className="border-t border-line pt-4">
        <WeekStrip profile={profile} todayDone={xp.isUnlocked} />
      </div>
      <div className="flex items-center justify-between gap-3 text-[13px] -mt-1">
        <span className="inline-flex items-center gap-1.5 text-ink2 tabular">
          <Flame className={`w-3.5 h-3.5 ${profile.currentStreak > 0 ? 'text-accent' : 'text-ink3'}`} />
          Sequência de {profile.currentStreak} {profile.currentStreak === 1 ? 'dia' : 'dias'}
        </span>
        {profile.isHardModeEnabled ? (
          <span className="text-accent font-semibold">Modo Elite: sem escudo</span>
        ) : (
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 tabular ${
              profile.weeklyShieldsRemaining > 0 ? 'text-ink2' : 'text-ink3'
            }`}
            title="Escudo de Chakra: protege a sequência de 1 falta na semana"
          >
            <Shield className={`w-3.5 h-3.5 ${profile.weeklyShieldsRemaining > 0 ? 'text-ok' : ''}`} />
            {profile.weeklyShieldsRemaining}/{profile.weeklyShieldsMax}
          </span>
        )}
      </div>
    </section>
  );
};
