import React, { useMemo, useState } from 'react';
import { useChallengeStore } from '../../../state/useChallengeStore';
import { getTodayString, addDaysToDateString, parseDate, daysBetween } from '../../../core/dateUtils';
import {
  boardDayProgress,
  boardEndDate,
  boardStats,
  cellKey,
  goalPctOf,
  marksOn,
  rowActiveOn,
  sectionCells,
  sectionProgress,
} from '../../../core/board';
import { BoardSection, UserChallenge } from '../../../core/types';
import { Bar, Menu, Ring, SectionHeader, Stat, pillarColor } from '../../ui/kit';
import { CalendarDays, Check, CheckCheck, ChevronDown, Flag, RotateCcw } from 'lucide-react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const sectionColor = (s: Pick<BoardSection, 'color' | 'pillarId'>) => s.color || pillarColor(s.pillarId || 'genjutsu');

const shortDate = (date: string) => {
  const d = parseDate(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface BoardChallengeViewProps {
  challengeId: string;
}

/** Quadro de operação: resumo, seletor de dia, seções compactas e mapa do desafio. */
export const BoardChallengeView: React.FC<BoardChallengeViewProps> = ({ challengeId }) => {
  const challenge = useChallengeStore((s) => s.challenges.find((c) => c.id === challengeId));
  const toggleBoardCells = useChallengeStore((s) => s.toggleBoardCells);

  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [showMap, setShowMap] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!challenge) return null;

  const end = boardEndDate(challenge);
  const notStarted = today < challenge.startDate;
  const date = selectedDate < challenge.startDate ? challenge.startDate : selectedDate > end ? end : selectedDate;
  const stats = boardStats(challenge, today);
  const isToday = date === today;
  const isFuture = date > today;
  const day = boardDayProgress(challenge, date);
  const marks = marksOn(challenge, date);
  const goal = goalPctOf(challenge);

  const toggle = (keys: string[], value?: boolean) => {
    const res = toggleBoardCells(challenge.id, keys, date, value);
    if (res.blockedReason) {
      setNotice(res.blockedReason);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // Últimos 7 dias do desafio até hoje (ou até o fim)
  const lastLived = today > end ? end : today;
  const stripStart = [addDaysToDateString(lastLived, -6), challenge.startDate].sort().pop()!;
  const strip = notStarted ? [] : Array.from({ length: daysBetween(stripStart, lastLived) + 1 }, (_, i) => addDaysToDateString(stripStart, i));

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="t-label">
              {notStarted ? 'Começa em ' + shortDate(challenge.startDate) : `Fase · ${stats.phase}`}
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="t-label">Dia</span>
              <span className="t-num text-[44px] text-ink">{stats.dayNumber}</span>
              <span className="t-num text-lg text-ink3">/{challenge.targetDays}</span>
            </div>
          </div>
          <Ring value={stats.today.pct / 100} size={76} stroke={6} color={stats.today.completed ? 'rgb(var(--ok))' : undefined}>
            <span className="t-num text-[17px] text-ink">{stats.today.pct}%</span>
            <span className="text-[9px] font-semibold tracking-wider text-ink3 mt-0.5">HOJE</span>
          </Ring>
        </div>
        <Bar value={stats.timePct} className="mt-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-4 mt-5 pt-5 border-t border-line">
          <Stat value={stats.today.done} suffix={`/${stats.today.total}`} label="Hoje" tone={stats.today.completed ? 'ok' : 'ink'} />
          <Stat value={stats.daysCompleted} label="Cumpridos" />
          <Stat value={stats.streak} label="Sequência" />
          <Stat value={`${stats.adherence}%`} label="Adesão" />
        </div>
        <p className="text-[13px] text-ink2 mt-4 leading-snug">
          {stats.today.completed ? (
            <span className="text-ok font-semibold">Meta de hoje batida. </span>
          ) : (
            <>
              Faltam <b className="text-ink tabular">{stats.today.remainingToGoal}</b> tarefas para a meta do dia ({goal}%).{' '}
            </>
          )}
          {stats.nextMilestone && (
            <span className="inline-flex items-center gap-1 text-ink">
              <Flag className="w-3.5 h-3.5 text-accent" />
              {stats.nextMilestone.label} {stats.nextMilestone.inDays === 0 ? 'é hoje' : `em ${stats.nextMilestone.inDays} ${stats.nextMilestone.inDays === 1 ? 'dia' : 'dias'}`}
            </span>
          )}
        </p>
      </div>

      {/* Seletor de dia */}
      {strip.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {strip.map((d) => {
              const p = boardDayProgress(challenge, d);
              const active = d === date;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  aria-pressed={active}
                  className={`shrink-0 w-12 py-2 rounded-xl border flex flex-col items-center gap-1 transition-colors ${
                    active ? 'bg-ink border-ink text-bg' : 'border-line text-ink2 hover:border-ink3'
                  }`}
                >
                  <span className="text-[10px] font-semibold tracking-wider">{d === today ? 'HOJE' : WEEKDAYS[parseDate(d).getDay()]}</span>
                  <span className="text-[13px] font-bold tabular">{parseDate(d).getDate()}</span>
                  <span
                    className="w-6 h-1 rounded-full"
                    style={{
                      background: p.completed ? 'rgb(var(--ok))' : p.pct > 0 ? 'rgb(var(--warn))' : 'rgb(var(--surface-2))',
                      opacity: active && !p.completed && p.pct === 0 ? 0.4 : 1,
                    }}
                  />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              aria-expanded={showMap}
              className={`shrink-0 w-12 py-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${showMap ? 'border-ink text-ink' : 'border-line text-ink2'}`}
              aria-label="Mapa do desafio"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="text-[10px] font-semibold tracking-wider">MAPA</span>
            </button>
          </div>

          {showMap && <BoardMap challenge={challenge} selected={date} onSelect={(d) => setSelectedDate(d)} />}

          {!isToday && !isFuture && (
            <div className="flex items-center justify-between gap-2 mt-3 text-[13px] text-ink2">
              <span>
                Corrigindo <b className="text-ink">{shortDate(date)}</b>: conta para o desafio, sem XP nem Ryō.
              </span>
              <button type="button" onClick={() => setSelectedDate(today)} className="btn btn-ghost btn-sm shrink-0">
                <RotateCcw className="w-3.5 h-3.5" /> Hoje
              </button>
            </div>
          )}
        </div>
      )}

      {notice && (
        <div className="card px-4 py-3 text-[13px] text-ink border-warn/50" role="status">
          {notice}
        </div>
      )}

      {/* Seções */}
      <section>
        <SectionHeader
          title={isToday ? 'Operação de hoje' : `Operação de ${shortDate(date)}`}
          meta={`${day.done}/${day.total}${day.optionalTotal ? ` · +${day.optionalDone} extra` : ''}`}
        />
        {notStarted ? (
          <div className="card mt-2 px-5 py-8 text-center text-[13px] text-ink2">
            O quadro abre no dia {shortDate(challenge.startDate)}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2 items-start">
            {(challenge.sections || []).map((section) => (
              <BoardSectionCard key={section.id} section={section} marks={marks} date={date} onToggle={toggle} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────

interface BoardSectionCardProps {
  section: BoardSection;
  marks: Set<string>;
  date: string;
  onToggle: (keys: string[], value?: boolean) => void;
}

const BoardSectionCard: React.FC<BoardSectionCardProps> = ({ section, marks, date, onToggle }) => {
  const progress = sectionProgress(section, marks, date);
  const [collapsedOverride, setCollapsedOverride] = useState<boolean | null>(null);
  const collapsed = collapsedOverride ?? progress.complete;
  const color = sectionColor(section);
  const cells = sectionCells(section, date);
  const allKeys = cells.map((c) => c.key);
  const rows = section.rows.filter((r) => rowActiveOn(r, date));

  if (cells.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 pl-4 pr-1.5 py-2.5">
        <button
          type="button"
          onClick={() => setCollapsedOverride(!collapsed)}
          aria-expanded={!collapsed}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-1"
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className={`text-[15px] font-semibold leading-snug truncate ${progress.complete ? 'text-ink2' : 'text-ink'}`}>
                {section.title}
              </span>
              {progress.complete && <Check className="w-4 h-4 text-ok shrink-0" strokeWidth={3} />}
            </span>
            <span className="block mt-1.5">
              <Bar value={progress.total ? (progress.done / progress.total) * 100 : 0} color={progress.complete ? 'rgb(var(--ok))' : color} />
            </span>
          </span>
          <span className="text-[13px] font-semibold text-ink2 tabular shrink-0">
            {progress.done}/{progress.total}
          </span>
          <ChevronDown className={`w-4 h-4 text-ink3 shrink-0 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
        <Menu
          label={`Opções de ${section.title}`}
          items={[
            { label: 'Marcar tudo', icon: CheckCheck, onSelect: () => onToggle(allKeys, true) },
            { label: 'Desmarcar tudo', icon: RotateCcw, onSelect: () => onToggle(allKeys, false), hidden: progress.done === 0 },
          ]}
        />
      </div>

      {!collapsed && (
        <div className={`${section.kind === 'matrix' ? 'px-3' : 'px-4'} pb-3.5 pt-0.5 animate-in fade-in`}>
          {section.kind === 'matrix' ? (
            <MatrixGrid section={section} rows={rows} marks={marks} color={color} onToggle={onToggle} />
          ) : (
            <ul className="space-y-0.5">
              {rows.map((row) => {
                const key = cellKey(section.id, row.id);
                const checked = marks.has(key);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => onToggle([key])}
                      className="w-full flex items-center gap-3 py-2 text-left touch-manipulation group"
                    >
                      <span
                        className={`w-[22px] h-[22px] rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'text-white' : 'border-ink3 group-hover:border-ink2'
                        }`}
                        style={checked ? { background: color, borderColor: color } : undefined}
                      >
                        {checked && <Check className="w-3.5 h-3.5 animate-pop" strokeWidth={3} />}
                      </span>
                      <span className={`text-[14px] leading-snug flex-1 min-w-0 ${checked ? 'text-ink3 line-through decoration-ink3/60' : 'text-ink'}`}>
                        {row.label}
                      </span>
                      {row.optional && <span className="chip !h-5 !px-2 !text-[10px] shrink-0">extra</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const MatrixGrid: React.FC<{
  section: BoardSection;
  rows: BoardSection['rows'];
  marks: Set<string>;
  color: string;
  onToggle: (keys: string[], value?: boolean) => void;
}> = ({ section, rows, marks, color, onToggle }) => {
  const columns = section.columns || [];
  const template = `minmax(3.6rem, max-content) repeat(${columns.length}, minmax(0, 3.5rem))`;
  return (
    <div className="grid gap-x-1 gap-y-1.5 items-center" style={{ gridTemplateColumns: template }}>
      <span />
      {columns.map((col) => (
        <button
          key={col.id}
          type="button"
          onClick={() => onToggle(rows.map((r) => cellKey(section.id, r.id, col.id)))}
          className="text-[9.5px] font-semibold text-ink2 hover:text-ink truncate text-center pb-0.5 tracking-tight"
          title={`Marcar a coluna ${col.label}`}
        >
          {col.label}
        </button>
      ))}
      {rows.map((row) => (
        <React.Fragment key={row.id}>
          <button
            type="button"
            onClick={() => onToggle(columns.map((col) => cellKey(section.id, row.id, col.id)))}
            className="text-[13px] font-semibold text-ink text-left truncate pr-1 hover:text-accent tabular max-w-[7rem]"
            title={`Marcar a linha ${row.label}`}
          >
            {row.label}
            {row.optional && <span className="text-[10px] text-ink3 font-normal"> · extra</span>}
          </button>
          {columns.map((col) => {
            const key = cellKey(section.id, row.id, col.id);
            const checked = marks.has(key);
            return (
              <button
                key={col.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={`${row.label} · ${col.label}`}
                onClick={() => onToggle([key])}
                className="h-9 rounded-lg border flex items-center justify-center touch-manipulation transition-colors"
                style={checked ? { background: color, borderColor: color, color: '#fff' } : { borderColor: 'rgb(var(--line))' }}
              >
                {checked && <Check className="w-4 h-4 animate-pop" strokeWidth={3} />}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────

const BoardMap: React.FC<{ challenge: UserChallenge; selected: string; onSelect: (date: string) => void }> = ({
  challenge,
  selected,
  onSelect,
}) => {
  const today = getTodayString();
  const days = useMemo(
    () => Array.from({ length: challenge.targetDays }, (_, i) => addDaysToDateString(challenge.startDate, i)),
    [challenge.startDate, challenge.targetDays]
  );
  const milestoneByDate = new Map((challenge.milestones || []).map((m) => [m.date, m.label]));

  return (
    <div className="card p-4 mt-3 animate-in fade-in">
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(1.85rem, 1fr))' }}>
        {days.map((d, i) => {
          const future = d > today;
          const p = future ? null : boardDayProgress(challenge, d);
          const milestone = milestoneByDate.get(d);
          const bg = !p
            ? 'transparent'
            : p.completed
            ? 'rgb(var(--ok))'
            : p.pct > 0
            ? `rgb(var(--warn) / ${0.25 + (p.pct / 100) * 0.6})`
            : d < today
            ? 'rgb(var(--accent) / 0.18)'
            : 'rgb(var(--surface-2))';
          return (
            <button
              key={d}
              type="button"
              disabled={future}
              onClick={() => onSelect(d)}
              title={`Dia ${i + 1} · ${shortDate(d)}${milestone ? ` · ${milestone}` : ''}${p ? ` · ${p.pct}%` : ''}`}
              className={`relative aspect-square rounded-md text-[10px] font-semibold tabular flex items-center justify-center border ${
                d === selected ? 'border-ink' : d === today ? 'border-accent' : 'border-transparent'
              } ${future ? 'text-ink3 opacity-60 border-line' : p?.completed ? 'text-bg' : 'text-ink2'}`}
              style={{ background: bg }}
            >
              {i + 1}
              {milestone && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px] text-ink2">
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgb(var(--ok))' }} /> Cumprido</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgb(var(--warn) / 0.6)' }} /> Parcial</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgb(var(--accent) / 0.18)' }} /> Falta</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full bg-accent" /> Data marcante</span>
      </div>
      {(challenge.milestones || []).length > 0 && (
        <ul className="mt-3 pt-3 border-t border-line space-y-1 text-[12px] text-ink2">
          {(challenge.milestones || []).map((m) => (
            <li key={m.id} className="flex justify-between gap-2">
              <span>{m.label}</span>
              <span className="tabular text-ink3">
                Dia {daysBetween(challenge.startDate, m.date) + 1} · {shortDate(m.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
