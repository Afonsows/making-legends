import React, { useState } from 'react';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { useChallengeContext, useChallengeView } from '../../state/challengeSelectors';
import { Mission } from '../../core/types';
import { ChallengeMapDay, challengeDay, getChallengeCompletionReward, habitActiveOn, missionsOfChallenge } from '../../core/challenges';
import { formatDateBR, parseDate } from '../../core/dateUtils';
import { isBoard } from '../../core/board';
import { EditChallengeModal } from './EditChallengeModal';
import { ChallengeHabitCard } from './ChallengeHabitCard';
import { AddMissionModal } from '../missions/AddMissionModal';
import { BoardChallengeView } from './board/BoardChallengeView';
import { BoardEditorModal } from './board/BoardEditorModal';
import { useChallengeActions } from './ChallengesView';
import { challengeEndNote, challengeStateLabel } from './challengeText';
import { Bar, CheckButton, Menu, SectionHeader, Sheet, Stat } from '../ui/kit';
import { Ban, CheckCircle2, Copy, LayoutGrid, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const DAY_STYLE: Record<ChallengeMapDay['status'], string> = {
  done: 'bg-ink border-ink text-bg',
  missed: 'border-accent/60 text-accent',
  grace: 'border-transparent bg-surface2 text-ink3',
  today: 'border-accent text-ink',
  future: 'border-line text-ink3 opacity-50',
  closed: 'border-transparent bg-surface2 text-ink3 opacity-40',
};

const DAY_LABEL: Record<ChallengeMapDay['status'], string> = {
  done: 'cumprido',
  missed: 'falta',
  grace: 'antes de o desafio valer',
  today: 'hoje',
  future: 'ainda não chegou',
  closed: 'depois do encerramento',
};

type MissionDraft = Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>;

/** Corrigir um dia passado: marcar ou desmarcar os hábitos que valiam naquele dia. */
const DaySheet: React.FC<{ challengeId: string; date: string | null; onClose: () => void }> = ({ challengeId, date, onClose }) => {
  const { ctx, today } = useChallengeContext();
  const toggleMissionOnDate = useHabitStore((s) => s.toggleMissionOnDate);
  const [notice, setNotice] = useState<string | null>(null);
  const challenge = ctx.index.get(challengeId);
  if (!challenge || !date) return null;

  const habits = missionsOfChallenge(challengeId, ctx.missions, ctx.links).filter((m) => habitActiveOn(m, ctx.links, ctx.index, date));
  const day = challengeDay(challenge, ctx, date);
  const isToday = date === today;

  return (
    <Sheet
      isOpen
      onClose={onClose}
      title={isToday ? 'Hoje' : formatDateBR(date)}
      subtitle={`${day.completed ? 'Dia cumprido' : 'Dia não cumprido'} · ${day.done} de ${day.total} hábitos`}
      zIndex={120}
    >
      {!isToday && (
        <p className="text-[13px] text-ink2 mb-4 leading-snug">
          Corrigir um dia passado conta para o desafio e para a sequência, mas não paga XP nem Ryō.
        </p>
      )}
      {habits.length === 0 ? (
        <p className="text-[13px] text-ink3">Nenhum hábito valia neste dia.</p>
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {habits.map((m) => {
            const checked = (m.completedDates || []).includes(date);
            return (
              <div key={m.id} className="flex items-center gap-3.5 px-4 py-3.5">
                <CheckButton
                  checked={checked}
                  label={checked ? `Desmarcar ${m.title}` : `Marcar ${m.title}`}
                  onClick={() => {
                    const res = toggleMissionOnDate(m.id, date);
                    if (!res.success && res.reason) {
                      setNotice(res.reason);
                      setTimeout(() => setNotice(null), 3500);
                    }
                  }}
                />
                <span className={`text-[15px] font-semibold flex-1 ${checked ? 'text-ink3 line-through' : 'text-ink'}`}>{m.title}</span>
                <span className="text-[13px] text-ink3 tabular">{m.xpReward} XP</span>
              </div>
            );
          })}
        </div>
      )}
      {notice && <p className="text-[13px] text-accent mt-3">{notice}</p>}
    </Sheet>
  );
};

/** Detalhe de um desafio (hábitos ou quadro de operação). Fica no App: abre de qualquer tela. */
export const ChallengeDetailModal: React.FC = () => {
  const { selectedChallengeId, isDetailModalOpen, closeDetailModal } = useChallengeStore();
  const { addMission, updateMission, deleteMission } = useHabitStore();
  const openStartChallengeModal = useUserStore((s) => s.openStartChallengeModal);
  const view = useChallengeView(isDetailModalOpen ? selectedChallengeId : null);
  const actions = useChallengeActions();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBoardEditorOpen, setIsBoardEditorOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [editingHabit, setEditingHabit] = useState<Mission | null>(null);
  const [addingHabit, setAddingHabit] = useState(false);

  if (!view) return null;
  const { challenge, stats, habits } = view;
  const board = isBoard(challenge);
  const open = stats.state === 'active' || stats.state === 'scheduled';
  const endNote = challengeEndNote(challenge, stats);
  const reward = getChallengeCompletionReward(challenge.targetDays);

  const close = () => {
    setDayOpen(null);
    closeDetailModal();
  };

  const startAgain = () => {
    close();
    openStartChallengeModal(challenge.id);
  };

  const handleSaveHabit = (data: MissionDraft) => {
    if (editingHabit) updateMission(editingHabit.id, data);
    else addMission(data, challenge.id);
  };

  return (
    <>
      <div className="modal-overlay z-[90] animate-in fade-in" onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={challenge.title}
          onClick={(e) => e.stopPropagation()}
          className="modal-panel w-full max-w-2xl bg-bg border border-line rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom"
        >
          {/* Cabeçalho */}
          <div className="px-5 pt-5 pb-4 border-b border-line">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className={`t-label ${stats.state === 'completed' ? '!text-ok' : ''}`}>
                  {challengeStateLabel(challenge, stats)}
                  {challenge.isEliteMode && <span className="text-accent"> · Elite</span>}
                </div>
                <h2 className="t-title text-[26px] text-ink mt-2.5">{challenge.title}</h2>
              </div>
              <div className="flex items-center shrink-0 -mt-1.5 -mr-2">
                <Menu
                  label="Opções do desafio"
                  items={[
                    { label: 'Editar quadro', icon: LayoutGrid, onSelect: () => setIsBoardEditorOpen(true), hidden: !board },
                    { label: 'Editar desafio', icon: Pencil, onSelect: () => setIsEditOpen(true) },
                    { label: 'Começar outro com estes hábitos', icon: Copy, onSelect: startAgain, hidden: board || habits.length === 0 },
                    { label: 'Concluir agora', icon: CheckCircle2, onSelect: () => actions.finish(challenge), hidden: stats.state !== 'active' },
                    { label: 'Encerrar', icon: Ban, onSelect: () => actions.abandon(challenge), hidden: !open },
                    { label: 'Reabrir', icon: RotateCcw, onSelect: () => actions.reopen(challenge), hidden: !challenge.closedAt },
                    {
                      label: 'Excluir',
                      icon: Trash2,
                      danger: true,
                      onSelect: () => {
                        actions.remove(challenge);
                      },
                    },
                  ]}
                />
                <button type="button" onClick={close} className="icon-btn" aria-label="Fechar">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {challenge.description && <p className="text-sm text-ink2 mt-2 leading-snug">{challenge.description}</p>}
          </div>

          {board ? (
            <div className="overflow-y-auto overscroll-contain px-5 py-5">
              {endNote && !open && <p className="card px-4 py-3 text-[13px] text-ink2 mb-5">{endNote}</p>}
              <BoardChallengeView challengeId={challenge.id} />
              <button type="button" onClick={() => setIsBoardEditorOpen(true)} className="btn btn-ghost w-full mt-5">
                <LayoutGrid className="w-4 h-4" /> Editar quadro
              </button>
            </div>
          ) : (
            <div className="overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
              {/* Resumo */}
              <div className="card p-5">
                <div className="flex items-baseline gap-2">
                  <span className="t-label">Dia</span>
                  <span className="t-num text-[44px] text-ink">{stats.dayNumber}</span>
                  <span className="t-num text-lg text-ink3">/{stats.targetDays}</span>
                </div>
                <Bar value={stats.timePct} className="mt-3.5" color={stats.state === 'completed' ? 'rgb(var(--ok))' : undefined} />
                <div className="flex items-center justify-between gap-3 mt-2.5 text-[13px] text-ink2">
                  <span className="truncate">
                    {stats.state === 'scheduled' ? `Começa em ${formatDateBR(challenge.startDate)}` : `Fase ${stats.phaseIndex} · ${stats.phase}`}
                  </span>
                  <span className="shrink-0 tabular">
                    {open ? `${stats.remaining} ${stats.remaining === 1 ? 'dia restante' : 'dias restantes'}` : `até ${formatDateBR(stats.lastDate)}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-5 mt-5 pt-5 border-t border-line">
                  <Stat value={stats.daysCompleted} label="Cumpridos" />
                  <Stat value={stats.daysMissed} label="Faltas" tone={stats.daysMissed > 0 && challenge.isEliteMode ? 'accent' : 'ink'} />
                  <Stat value={`${stats.adherence}%`} label="Adesão" />
                  <Stat value={stats.streak} label="Seguidos" />
                </div>
                {endNote && <p className="text-[13px] text-ink2 mt-4 leading-snug">{endNote}</p>}
                {open && (
                  <p className="text-xs text-ink3 mt-4 leading-snug">
                    {challenge.isEliteMode
                      ? 'Modo Elite: +20% de XP, sem escudo, e qualquer falta encerra o desafio.'
                      : 'Faltas não encerram o desafio: elas aparecem no mapa e pesam na adesão.'}{' '}
                    Ao chegar ao fim: +{reward.xp} XP e +{reward.ryo} Ryō.
                  </p>
                )}
              </div>

              {/* Mapa dos dias */}
              {stats.state !== 'scheduled' && (
                <section>
                  <SectionHeader title="Mapa" meta={`${stats.daysCompleted} de ${stats.targetDays}`} />
                  <p className="text-xs text-ink3 mt-1 mb-3">Toque em um dia para ver ou corrigir as marcações.</p>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                    {stats.days.map((d) => {
                      const clickable = d.status !== 'future' && d.status !== 'closed';
                      return (
                        <button
                          key={d.date}
                          type="button"
                          disabled={!clickable}
                          onClick={() => setDayOpen(d.date)}
                          title={`Dia ${d.dayNumber} · ${formatDateBR(d.date)} · ${DAY_LABEL[d.status]}`}
                          aria-label={`Dia ${d.dayNumber}, ${formatDateBR(d.date)}: ${DAY_LABEL[d.status]}`}
                          className={`aspect-square rounded-lg border flex flex-col items-center justify-center leading-none ${DAY_STYLE[d.status]}`}
                        >
                          <span className="text-[9px] font-semibold opacity-70">{WEEKDAYS[parseDate(d.date).getDay()]}</span>
                          <span className="text-[12px] font-bold tabular mt-0.5">{d.dayNumber}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-ink2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-ink" /> Cumprido
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border border-accent/60" /> Falta
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-surface2" /> Antes de valer
                    </span>
                  </div>
                </section>
              )}

              {/* Hábitos */}
              <section>
                <SectionHeader title="Hábitos" meta={habits.length}>
                  {open && (
                    <button
                      type="button"
                      onClick={() => setAddingHabit(true)}
                      className="icon-btn !bg-ink !text-bg"
                      aria-label="Adicionar hábito"
                    >
                      <Plus className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  )}
                </SectionHeader>
                <div className="mt-2 space-y-2.5">
                  {habits.map((habit) => (
                    <ChallengeHabitCard
                      key={habit.id}
                      habit={habit}
                      challenge={challenge}
                      editable={open}
                      onEdit={() => setEditingHabit(habit)}
                      onRemove={() => {
                        const msg =
                          (habit.completedDates || []).length > 0
                            ? `Retirar "${habit.title}" do desafio? Os dias em que ele já contou continuam no histórico.`
                            : `Excluir o hábito "${habit.title}"?`;
                        if (window.confirm(msg)) deleteMission(habit.id);
                      }}
                    />
                  ))}
                  {habits.length === 0 && (
                    <div className="card px-5 py-6 text-center text-[13px] text-ink2">Nenhum hábito neste desafio.</div>
                  )}
                </div>
                {!open && habits.length > 0 && (
                  <button type="button" onClick={startAgain} className="btn btn-primary w-full mt-4">
                    <Copy className="w-4 h-4" /> Começar outro com estes hábitos
                  </button>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <DaySheet challengeId={challenge.id} date={dayOpen} onClose={() => setDayOpen(null)} />
      {board && <BoardEditorModal isOpen={isBoardEditorOpen} onClose={() => setIsBoardEditorOpen(false)} challenge={challenge} />}
      {isEditOpen && <EditChallengeModal isOpen onClose={() => setIsEditOpen(false)} challenge={challenge} />}
      <AddMissionModal
        key={editingHabit ? `edit_${editingHabit.id}` : 'new_in_challenge'}
        isOpen={addingHabit || editingHabit !== null}
        onClose={() => {
          setAddingHabit(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
        initialData={editingHabit}
      />
    </>
  );
};
