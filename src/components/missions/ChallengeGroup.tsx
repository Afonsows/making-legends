import React from 'react';
import { Mission } from '../../core/types';
import { ChallengeView } from '../../state/challengeSelectors';
import { useHabitStore } from '../../state/useHabitStore';
import { useUIStore } from '../../state/useUIStore';
import { MissionCard } from './MissionCard';
import { challengeStateLabel } from '../challenges/challengeText';
import { Bar, Menu, MenuItem } from '../ui/kit';
import { Check, CheckCheck, ChevronDown, ChevronRight, Plus, RotateCcw } from 'lucide-react';

interface HabitListProps {
  missions: Mission[];
  onEdit: (mission: Mission) => void;
  deleteConfirm: (mission: Mission) => string;
}

/** Lista de hábitos de um grupo: pendentes primeiro; feitos depois (recolhíveis). */
export const HabitList: React.FC<HabitListProps> = ({ missions, onEdit, deleteConfirm }) => {
  const { toggleCompleteMission, deleteMission, moveMission } = useHabitStore();
  const collapsed = useUIStore((s) => s.isCompletedMissionsCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleCompletedMissions);
  const pending = missions.filter((m) => !m.isCompletedToday);
  const done = missions.filter((m) => m.isCompletedToday);
  const pendingIds = pending.map((m) => m.id);

  return (
    <>
      {pending.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden">
          {pending.map((mission, idx) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onToggle={() => toggleCompleteMission(mission.id)}
              onEdit={() => onEdit(mission)}
              onDelete={() => deleteMission(mission.id)}
              deleteConfirm={deleteConfirm(mission)}
              onMoveUp={() => moveMission(mission.id, 'up', pendingIds)}
              onMoveDown={() => moveMission(mission.id, 'down', pendingIds)}
              canMoveUp={idx > 0}
              canMoveDown={idx < pending.length - 1}
            />
          ))}
        </div>
      )}
      {pending.length === 0 && missions.length > 0 && (
        <div className="card px-5 py-4 flex items-center gap-3 text-[13px] text-ink2">
          <Check className="w-4 h-4 text-ok shrink-0" strokeWidth={2.75} />
          Tudo feito por hoje.
        </div>
      )}
      {done.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-between min-h-[2.25rem] px-1"
            aria-expanded={!collapsed}
          >
            <span className="flex items-baseline gap-2">
              <span className="t-label">Feitos hoje</span>
              <span className="text-xs text-ink3 tabular">{done.length}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-ink3 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
          {!collapsed && (
            <div className="card mt-1 divide-y divide-line overflow-hidden">
              {done.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onToggle={() => toggleCompleteMission(mission.id)}
                  onEdit={() => onEdit(mission)}
                  onDelete={() => deleteMission(mission.id)}
                  deleteConfirm={deleteConfirm(mission)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

interface ChallengeGroupProps {
  view: ChallengeView;
  onOpen: () => void;
  onAddHabit: () => void;
  onEditHabit: (mission: Mission) => void;
  extraMenu?: MenuItem[];
}

/** Um desafio na tela Hoje: cabeçalho com o andamento e a meta do dia, e os hábitos dele. */
export const ChallengeGroup: React.FC<ChallengeGroupProps> = ({ view, onOpen, onAddHabit, onEditHabit, extraMenu = [] }) => {
  const { challenge, stats, habitsToday } = view;
  const { completeAllMissionsToday, uncompleteAllMissionsToday } = useHabitStore();
  const ids = habitsToday.map((m) => m.id);
  const scheduled = stats.state === 'scheduled';
  const day = stats.today;
  const elite = challenge.isEliteMode;

  const note = scheduled
    ? `${view.habits.length} ${view.habits.length === 1 ? 'hábito' : 'hábitos'} prontos para o dia 1.`
    : day.completed
    ? 'Dia cumprido neste desafio.'
    : day.total === 0
    ? 'Nenhum hábito para hoje.'
    : `Faltam ${Math.max(0, (day.neededXp || 0) - (day.earnedXp || 0))} XP para cumprir o dia.`;

  const misses =
    !scheduled && stats.missesThisWeek > 0
      ? `${stats.missesThisWeek} ${stats.missesThisWeek === 1 ? 'falta' : 'faltas'} na semana ${stats.week}`
      : null;

  return (
    <section>
      <div className="flex items-start gap-2 px-1">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left group">
          <div className="t-label truncate">
            {challengeStateLabel(challenge, stats)}
            {elite && <span className="text-accent"> · Elite</span>}
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <h2 className="text-[19px] font-bold text-ink leading-tight truncate">{challenge.title}</h2>
            <ChevronRight className="w-4 h-4 text-ink3 shrink-0 group-hover:text-ink" />
          </div>
        </button>
        <div className="shrink-0 flex items-center -mr-2">
          {!scheduled && (
            <span className={`t-num text-[17px] mr-1 ${day.completed ? 'text-ok' : 'text-ink'}`}>
              {day.done}
              <span className="text-xs text-ink3 font-semibold">/{day.total}</span>
            </span>
          )}
          <Menu
            label={`Opções de ${challenge.title}`}
            items={[
              { label: 'Adicionar hábito', icon: Plus, onSelect: onAddHabit },
              {
                label: 'Concluir todos de hoje',
                icon: CheckCheck,
                hidden: scheduled || habitsToday.every((m) => m.isCompletedToday),
                onSelect: () => completeAllMissionsToday(ids),
              },
              {
                label: 'Desmarcar todos de hoje',
                icon: RotateCcw,
                hidden: !habitsToday.some((m) => m.isCompletedToday),
                onSelect: () => uncompleteAllMissionsToday(ids),
              },
              ...extraMenu,
            ]}
          />
        </div>
      </div>

      {!scheduled && (
        <div className="px-1 mt-3">
          <Bar
            value={Math.min(100, ((day.earnedXp || 0) / Math.max(1, day.neededXp || 1)) * 100)}
            color={day.completed ? 'rgb(var(--ok))' : undefined}
          />
          <div className="flex items-center justify-between gap-3 mt-2 text-[13px]">
            <span className={day.completed ? 'text-ok font-semibold' : 'text-ink2'}>{note}</span>
            {misses && <span className={`shrink-0 tabular ${elite ? 'text-accent' : 'text-ink3'}`}>{misses}</span>}
          </div>
        </div>
      )}
      {scheduled && <p className="px-1 mt-2 text-[13px] text-ink2">{note}</p>}

      {!scheduled && (
        <div className="mt-3">
          <HabitList
            missions={habitsToday}
            onEdit={onEditHabit}
            deleteConfirm={(m) =>
              (m.completedDates || []).length > 0
                ? `Retirar "${m.title}" do desafio? Ele sai da tela Hoje, e os dias em que já contou continuam no histórico.`
                : `Excluir o hábito "${m.title}"?`
            }
          />
          <button
            type="button"
            onClick={onAddHabit}
            className="w-full flex items-center justify-center gap-1.5 min-h-[2.75rem] mt-1 text-[13px] font-semibold text-ink2 hover:text-ink"
          >
            <Plus className="w-4 h-4" /> Adicionar hábito
          </button>
        </div>
      )}
    </section>
  );
};
