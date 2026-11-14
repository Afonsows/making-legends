import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { evaluateProtocolStatus } from '../../core/streakEngine';
import { addDaysToDateString, formatDateBR, getTodayString, parseDate } from '../../core/dateUtils';
import { EditChallengeModal } from '../challenges/EditChallengeModal';
import { buildSyncedOfficial66Challenge } from '../../state/useChallengeStore';
import { Bar, Menu, Ring } from '../ui/kit';
import { Check, History, Map, Pencil, Shield, Trash2 } from 'lucide-react';
import { DailyXpProgress } from '../../core/dayLog';
import { UserProfile } from '../../core/types';

interface DailyCheckInCardProps {
  onOpenMap?: () => void;
  onOpenHistory?: () => void;
}

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Meta do dia: anel + XP feito / XP necessário para o dia contar. */
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
            ? 'Crie missões para definir a meta do dia.'
            : done
            ? 'Dia garantido. O que vier a mais é bônus.'
            : `Faltam ${xp.remainingXpToUnlock} XP para o dia contar na sequência.`}
        </p>
      </div>
    </div>
  );
};

/** Últimos 7 dias: cumprido, protegido por escudo, perdido ou hoje. */
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

/** Cartão principal da tela "Hoje": o desafio em curso e a meta do dia. */
export const DailyCheckInCard: React.FC<DailyCheckInCardProps> = ({ onOpenMap, onOpenHistory }) => {
  const {
    profile,
    openChallengeMapModal,
    openChallengeHistoryModal,
    openStartChallengeModal,
    deleteActiveChallenge,
  } = useUserStore();
  const { missions } = useHabitStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const status = evaluateProtocolStatus(profile, missions);
  const { xpProgress } = status;
  const handleOpenMap = onOpenMap || openChallengeMapModal;
  const handleOpenHistory = onOpenHistory || openChallengeHistoryModal;
  const cycle = profile.activeChallenge && profile.activeChallenge.status === 'active' ? profile.activeChallenge : undefined;

  const handleDeleteActiveChallenge = () => {
    if (
      window.confirm(
        'Excluir o desafio ativo? As marcações, os dias cumpridos e as recompensas (XP e Ryō) obtidos desde o início dele serão desfeitos. Esta ação não pode ser revertida.'
      )
    ) {
      deleteActiveChallenge();
    }
  };

  const dayBlock = (
    <>
      <div className="border-t border-line pt-5">
        <DayGoal xp={xpProgress} />
      </div>
      <div className="border-t border-line pt-4">
        <WeekStrip profile={profile} todayDone={xpProgress.isUnlocked} />
      </div>
    </>
  );

  // ── Sem desafio ativo ─────────────────────────────────────
  if (!cycle) {
    return (
      <section className="card p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="t-label">Sem desafio em curso</div>
            <h2 className="t-title text-[26px] text-ink mt-3">Comece uma jornada</h2>
            <p className="text-sm text-ink2 mt-2 leading-snug">
              Escolha a duração (21 a 90 dias) e suas missões. Sua sequência continua contando mesmo sem desafio.
            </p>
          </div>
          <Menu items={[{ label: 'Histórico de ciclos', icon: History, onSelect: handleOpenHistory }]} />
        </div>
        <button type="button" onClick={openStartChallengeModal} className="btn btn-primary w-full">
          Iniciar desafio
        </button>
        {dayBlock}
      </section>
    );
  }

  // ── Desafio agendado (começa no futuro) ───────────────────
  if (status.isScheduled) {
    return (
      <section className="card p-5 space-y-5">
        <div>
          <div className="t-label truncate">{cycle.title || `Desafio ${status.targetDays} dias`}</div>
          <h2 className="t-title text-[26px] text-ink mt-3">
            Começa em {status.daysUntilStart} {status.daysUntilStart === 1 ? 'dia' : 'dias'}
          </h2>
          <p className="text-sm text-ink2 mt-2 leading-snug">
            Dia 1 em {formatDateBR(cycle.startDate)}. Até lá, ajuste suas missões — os dias já contam para a sequência.
          </p>
        </div>
        {dayBlock}
      </section>
    );
  }

  // ── Desafio em andamento ──────────────────────────────────
  const allowed = status.allowedMissesPerWeek;
  const missed = status.missedDaysInCurrentWeek;
  const atRisk = missed >= allowed;
  const weekNote =
    allowed === 0
      ? 'Modo Elite: qualquer falta encerra o desafio'
      : atRisk
      ? 'Mais uma falta nesta semana encerra o desafio'
      : `Semana ${status.currentWeek} · ${missed} de ${allowed} falta tolerada`;

  return (
    <>
      <section className="card p-5 space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-1">
              <div className="t-label truncate">
                {cycle.title || `Desafio ${status.targetDays} dias`}
                {cycle.isEliteMode && <span className="text-accent"> · Elite</span>}
              </div>
            </div>
            <div className="-mt-2 -mr-2">
              <Menu
                label="Opções do desafio"
                items={[
                  { label: 'Mapa do desafio', icon: Map, onSelect: handleOpenMap },
                  { label: 'Histórico de ciclos', icon: History, onSelect: handleOpenHistory },
                  { label: 'Editar desafio', icon: Pencil, onSelect: () => setIsEditModalOpen(true) },
                  { label: 'Excluir desafio', icon: Trash2, onSelect: handleDeleteActiveChallenge, danger: true },
                ]}
              />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="t-label">Dia</span>
            <span className="t-num text-[64px] text-ink">{status.currentDay}</span>
            <span className="t-num text-xl text-ink3">/{status.targetDays}</span>
          </div>

          <Bar value={status.protocolProgressPercent} className="mt-4" />
          <div className="flex items-center justify-between gap-3 mt-2.5 text-[13px] text-ink2">
            <span className="truncate">
              Fase {status.phaseIndex} · {status.phaseName}
            </span>
            <span className="shrink-0 tabular">
              {status.totalDaysRemaining} {status.totalDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
            </span>
          </div>
        </div>

        {dayBlock}

        <div className="flex items-center justify-between gap-3 text-[13px] -mt-1">
          <span className={atRisk || allowed === 0 ? 'text-accent font-semibold' : 'text-ink2'}>{weekNote}</span>
          {!profile.isHardModeEnabled && (
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

      {isEditModalOpen && (
        <EditChallengeModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          challenge={buildSyncedOfficial66Challenge(profile, missions)}
        />
      )}
    </>
  );
};
