import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { getLevelProgress } from '../../core/xpEngine';
import { calculateDailyXpProgress } from '../../core/streakEngine';
import { addDaysToDateString, getTodayString, parseDate } from '../../core/dateUtils';
import { PillarId } from '../../theme/types';
import { soundFx } from '../../utils/audio';
import { Bar, SectionHeader, Stat, Switch, pillarColor } from '../ui/kit';
import { Pencil } from 'lucide-react';

interface ProfileOverviewProps {
  onEditProfile: () => void;
  onOpenInventory: () => void;
}

const PILLAR_ORDER: PillarId[] = ['taijutsu', 'ninjutsu', 'chakra', 'espirito', 'genjutsu'];
const CHART_DAYS = 14;
const HEATMAP_WEEKS = 18;

interface DayPoint {
  date: string;
  xp: number;
  met: boolean;
  isToday: boolean;
}

const formatDay = (date: string) =>
  parseDate(date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');

/** XP por dia nos últimos 14 dias. Uma série só; o tom indica se a meta do dia foi atingida. */
const XpChart: React.FC<{ points: DayPoint[] }> = ({ points }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.xp));
  const metCount = points.filter((p) => p.met).length;
  const average = Math.round(points.reduce((acc, p) => acc + p.xp, 0) / points.length);
  const focus = selected !== null ? points[selected] : null;

  return (
    <div className="card p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="t-num text-[30px] text-ink">
            {focus ? focus.xp : average}
            <span className="text-sm font-semibold text-ink3 ml-1.5 font-wide">XP</span>
          </div>
          <div className="text-[13px] text-ink2 mt-2">
            {focus ? `${formatDay(focus.date)} · ${focus.met ? 'meta cumprida' : 'abaixo da meta'}` : 'média por dia'}
          </div>
        </div>
        <div className="text-right">
          <div className="t-num text-lg text-ink">
            {metCount}
            <span className="text-ink3">/{points.length}</span>
          </div>
          <div className="text-[13px] text-ink2 mt-1.5">dias cumpridos</div>
        </div>
      </div>

      <div
        className="flex items-end gap-[3px] h-28 mt-5 border-b border-line"
        role="img"
        aria-label={`XP por dia nos últimos ${points.length} dias. Média de ${average} XP; ${metCount} dias com a meta cumprida.`}
        onMouseLeave={() => setSelected(null)}
      >
        {points.map((p, i) => (
          <button
            key={p.date}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => setSelected(i)}
            onFocus={() => setSelected(i)}
            onClick={() => setSelected((s) => (s === i ? null : i))}
            title={`${formatDay(p.date)}: ${p.xp} XP`}
            className="flex-1 h-full flex items-end"
          >
            <span
              className={`block w-full rounded-t-[4px] transition-opacity ${p.met ? 'bg-ink' : 'bg-ink3'} ${
                selected !== null && selected !== i ? 'opacity-40' : p.met ? 'opacity-100' : 'opacity-60'
              }`}
              style={{ height: p.xp > 0 ? `${Math.max(4, (p.xp / max) * 100)}%` : '2px' }}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-ink3 tabular">
        <span>{formatDay(points[0].date)}</span>
        <span>hoje</span>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-ink2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-ink" /> Meta cumprida
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-ink3 opacity-60" /> Abaixo da meta
        </span>
      </div>
    </div>
  );
};

/** Mapa de consistência: uma coluna por semana, uma célula por dia. */
const ConsistencyMap: React.FC<{ doneDates: Set<string>; shielded: Set<string> }> = ({ doneDates, shielded }) => {
  const today = getTodayString();
  const endOfWeek = addDaysToDateString(today, 6 - parseDate(today).getDay());
  const weeks = Array.from({ length: HEATMAP_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDaysToDateString(endOfWeek, -((HEATMAP_WEEKS - 1 - w) * 7 + (6 - d))))
  );
  const total = weeks.flat().filter((date) => date <= today && doneDates.has(date)).length;

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="t-num text-[30px] text-ink">
          {total}
          <span className="text-sm font-semibold text-ink3 ml-1.5 font-wide">dias</span>
        </div>
        <div className="text-[13px] text-ink2">últimas {HEATMAP_WEEKS} semanas</div>
      </div>
      <div
        className="grid gap-[3px] mt-4"
        style={{ gridTemplateColumns: `repeat(${HEATMAP_WEEKS}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${total} dias cumpridos nas últimas ${HEATMAP_WEEKS} semanas`}
      >
        {weeks.map((week, w) => (
          <div key={w} className="grid gap-[3px]">
            {week.map((date) => {
              const future = date > today;
              const done = doneDates.has(date);
              const isShielded = !done && shielded.has(date);
              return (
                <span
                  key={date}
                  title={future ? undefined : `${formatDay(date)}: ${done ? 'cumprido' : isShielded ? 'protegido por escudo' : 'não cumprido'}`}
                  className={`aspect-square rounded-[3px] ${
                    future
                      ? 'bg-transparent'
                      : done
                      ? 'bg-ink'
                      : isShielded
                      ? 'bg-surface2 ring-1 ring-inset ring-ok/60'
                      : 'bg-surface2'
                  } ${date === today && !done ? 'ring-1 ring-inset ring-accent' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Aba "Resumo" do Perfil: nível, indicadores, gráficos e os cinco pilares. */
export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ onEditProfile, onOpenInventory }) => {
  const { profile, toggleHardMode, getEquippedItems, unequipItem } = useUserStore();
  const missions = useHabitStore((s) => s.missions);
  const { getRankByLevel, theme } = useTheme();
  const [eliteNotice, setEliteNotice] = useState<string | null>(null);

  const rankInfo = getRankByLevel(profile.level);
  const { currentLevel, currentLevelXp, nextLevelXpThreshold, progressPercent } = getLevelProgress(profile.totalXp);
  const equipped = getEquippedItems();
  const hasActiveChallenge = profile.activeChallenge?.status === 'active';
  const avatar =
    profile.avatarConfig.customEmoji ||
    (profile.gender === 'female' ? '🥷‍♀️' : rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge);

  const today = getTodayString();
  const todayXp = calculateDailyXpProgress(missions);
  const dayLog = profile.dayLog || {};
  const doneDates = new Set(Object.values(dayLog).filter((d) => d.completed).map((d) => d.date));
  if (todayXp.isUnlocked) doneDates.add(today);
  const shielded = new Set(profile.shieldedDates || []);

  const points: DayPoint[] = Array.from({ length: CHART_DAYS }, (_, i) => {
    const date = addDaysToDateString(today, i - (CHART_DAYS - 1));
    const isToday = date === today;
    return {
      date,
      xp: isToday ? todayXp.currentXp : dayLog[date]?.xpEarned ?? 0,
      met: isToday ? todayXp.isUnlocked : Boolean(dayLog[date]?.completed),
      isToday,
    };
  });

  const maxPillarXp = Math.max(1, ...PILLAR_ORDER.map((id) => profile.pillarXp[id] || 0));

  return (
    <div className="space-y-6">
      {/* Identidade e nível */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onEditProfile}
            aria-label="Editar perfil e avatar"
            className="relative w-16 h-16 rounded-full bg-surface2 border border-line flex items-center justify-center text-3xl shrink-0"
          >
            <span aria-hidden="true">{avatar}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-ink text-bg flex items-center justify-center border-2 border-surface">
              <Pencil className="w-3 h-3" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-ink truncate leading-tight">{profile.name}</h2>
            <div className="text-[13px] text-gold font-semibold mt-1 truncate">{rankInfo.name}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="t-num text-[40px] text-ink">{currentLevel}</div>
            <div className="t-label mt-2">Nível</div>
          </div>
        </div>

        <Bar value={progressPercent} className="mt-5" />
        <div className="flex justify-between mt-2.5 text-[13px] text-ink2 tabular">
          <span>
            {currentLevelXp} / {nextLevelXpThreshold} XP
          </span>
          <span>{profile.totalXp} XP no total</span>
        </div>
      </div>

      {/* Indicadores */}
      <div className="card grid grid-cols-2 divide-x divide-line">
        <div className="p-5 border-b border-line">
          <Stat value={profile.currentStreak} suffix="dias" label="Sequência" />
          <div className="text-xs text-ink3 mt-1.5 tabular">recorde {profile.bestStreak}</div>
        </div>
        <div className="p-5 border-b border-line">
          <Stat value={doneDates.size} suffix="dias" label="Cumpridos" />
          <div className="text-xs text-ink3 mt-1.5">desde o início</div>
        </div>
        <div className="p-5">
          <Stat value={profile.ryo || 0} label="Ryō" tone="gold" />
          <div className="text-xs text-ink3 mt-1.5">para gastar na loja</div>
        </div>
        <div className="p-5">
          <Stat
            value={profile.isHardModeEnabled ? '—' : profile.weeklyShieldsRemaining}
            suffix={profile.isHardModeEnabled ? undefined : `/${profile.weeklyShieldsMax}`}
            label="Escudo"
          />
          <div className="text-xs text-ink3 mt-1.5">
            {profile.isHardModeEnabled ? 'desligado no Modo Elite' : 'protege 1 falta na semana'}
          </div>
        </div>
      </div>

      {/* XP por dia */}
      <section>
        <SectionHeader title="XP por dia" meta={`${CHART_DAYS} dias`} />
        <div className="mt-2">
          <XpChart points={points} />
        </div>
      </section>

      {/* Consistência */}
      <section>
        <SectionHeader title="Consistência" />
        <div className="mt-2">
          <ConsistencyMap doneDates={doneDates} shielded={shielded} />
        </div>
      </section>

      {/* Pilares */}
      <section>
        <SectionHeader title="Pilares" meta="XP acumulado" />
        <div className="card mt-2 px-5 divide-y divide-line">
          {PILLAR_ORDER.map((id) => {
            const pillar = theme.pillars[id];
            const xp = profile.pillarXp[id] || 0;
            return (
              <div key={id} className="py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pillarColor(id) }} />
                    <span className="t-label !text-ink truncate">{pillar.categoryLabel}</span>
                    <span className="text-xs text-ink3 truncate">{pillar.name}</span>
                  </div>
                  <span className="t-num text-xl text-ink shrink-0">{xp}</span>
                </div>
                <Bar value={(xp / maxPillarXp) * 100} color={pillarColor(id)} className="mt-3" />
              </div>
            );
          })}
        </div>
      </section>

      {/* Relíquias equipadas */}
      <section>
        <SectionHeader title="Relíquias equipadas" meta={equipped.length || undefined}>
          <button type="button" onClick={onOpenInventory} className="text-[13px] font-semibold text-ink2 hover:text-ink px-1">
            Abrir mochila
          </button>
        </SectionHeader>
        <div className="card mt-2 divide-y divide-line">
          {equipped.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-ink2 text-center">Nenhuma relíquia equipada.</p>
          ) : (
            equipped.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{item.name}</div>
                  <div className="text-xs text-ink2 truncate">{item.description}</div>
                </div>
                <button type="button" onClick={() => unequipItem(item.id)} className="btn btn-ghost btn-sm shrink-0">
                  Remover
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modo Elite */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-ink">Modo Elite</div>
            <p className="text-[13px] text-ink2 mt-0.5 leading-snug">
              +20% de XP em todas as missões, sem Escudo e sem tolerância a faltas.
              {hasActiveChallenge && ' Fica travado até o desafio atual terminar.'}
            </p>
          </div>
          <Switch
            checked={profile.isHardModeEnabled}
            label="Modo Elite"
            onChange={() => {
              const res = toggleHardMode();
              if (!res.success) {
                soundFx.playError();
                setEliteNotice(res.reason || null);
                setTimeout(() => setEliteNotice(null), 4000);
              } else {
                soundFx.playButtonClick();
              }
            }}
          />
        </div>
        {eliteNotice && <p className="text-[13px] text-accent mt-3">{eliteNotice}</p>}
      </div>
    </div>
  );
};
