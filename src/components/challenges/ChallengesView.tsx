import React, { useState } from 'react';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useUserStore } from '../../state/useUserStore';
import { ChallengeView, useChallengeViews } from '../../state/challengeSelectors';
import { EditChallengeModal } from './EditChallengeModal';
import { challengeProgressLine, challengeStateLabel } from './challengeText';
import { UserChallenge } from '../../core/types';
import { isBoard } from '../../core/board';
import { Bar, Menu, SectionHeader, Stat } from '../ui/kit';
import { Ban, CheckCircle2, ChevronDown, LayoutGrid, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';

/** Dia corrente e percentual de um desafio (por tempo). Mantido para telas que ainda o usam. */
export function getChallengeProgress(challenge: Pick<UserChallenge, 'startDate' | 'targetDays'>, today: string) {
  const start = new Date(challenge.startDate + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');
  const diff = Math.max(0, now.getTime() - start.getTime());
  const daysElapsed = Math.min(challenge.targetDays, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  const percent = Math.min(100, Math.round((daysElapsed / challenge.targetDays) * 100));
  return { daysElapsed, percent };
}

/** Ações do menu ⋯ de um desafio (mesmas na lista e no detalhe). */
export function useChallengeActions() {
  const { closeChallenge, reopenChallenge, deleteChallenge } = useChallengeStore();
  return {
    finish: (c: UserChallenge) => {
      if (window.confirm(`Marcar "${c.title}" como concluído agora? Ele sai da tela Hoje e o bônus de conclusão não é pago antes do fim.`))
        closeChallenge(c.id, 'completed');
    },
    abandon: (c: UserChallenge) => {
      if (window.confirm(`Encerrar "${c.title}"? Os hábitos dele saem da tela Hoje; o histórico fica guardado e dá para reabrir depois.`))
        closeChallenge(c.id, 'abandoned');
    },
    reopen: (c: UserChallenge) => reopenChallenge(c.id),
    remove: (c: UserChallenge) => {
      if (
        window.confirm(
          `Excluir "${c.title}" de vez? Os hábitos, as marcações e as recompensas (XP e Ryō) deste desafio serão desfeitos. Esta ação não pode ser revertida.`
        )
      )
        deleteChallenge(c.id);
    },
  };
}

const ChallengeRow: React.FC<{ view: ChallengeView; onOpen: () => void; onEdit: () => void }> = ({ view, onOpen, onEdit }) => {
  const { challenge, stats } = view;
  const actions = useChallengeActions();
  const open = stats.state === 'active' || stats.state === 'scheduled';
  const board = isBoard(challenge);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="card p-4 cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className={`t-label truncate ${stats.state === 'completed' ? '!text-ok' : ''}`}>
            {challengeStateLabel(challenge, stats)}
            {challenge.isEliteMode && <span className="text-accent"> · Elite</span>}
            {board && <span> · Quadro</span>}
          </div>
          <h3 className="text-[16px] font-semibold text-ink leading-snug mt-2">{challenge.title}</h3>
          <div className="text-[13px] text-ink2 mt-1 tabular">
            {stats.state === 'active' && (
              <span className={stats.today.completed ? 'text-ok font-semibold' : ''}>
                {stats.today.done}/{stats.today.total} hoje ·{' '}
              </span>
            )}
            {challengeProgressLine(stats)}
          </div>
        </div>
        <div className="-mt-2 -mr-2" onClick={(e) => e.stopPropagation()}>
          <Menu
            label={`Opções de ${challenge.title}`}
            items={[
              { label: 'Editar desafio', icon: Pencil, onSelect: onEdit },
              { label: 'Concluir agora', icon: CheckCircle2, onSelect: () => actions.finish(challenge), hidden: stats.state !== 'active' },
              { label: 'Encerrar', icon: Ban, onSelect: () => actions.abandon(challenge), hidden: !open },
              { label: 'Reabrir', icon: RotateCcw, onSelect: () => actions.reopen(challenge), hidden: !challenge.closedAt },
              { label: 'Excluir', icon: Trash2, onSelect: () => actions.remove(challenge), danger: true },
            ]}
          />
        </div>
      </div>
      <Bar
        value={stats.state === 'scheduled' ? 0 : stats.timePct}
        color={stats.state === 'completed' ? 'rgb(var(--ok))' : open ? undefined : 'rgb(var(--ink-3))'}
        className="mt-3"
      />
    </div>
  );
};

export const ChallengesView: React.FC = () => {
  const openDetailModal = useChallengeStore((s) => s.openDetailModal);
  const { profile, openStartChallengeModal } = useUserStore();
  const { open, ended } = useChallengeViews();
  const [editing, setEditing] = useState<UserChallenge | null>(null);
  const [showEnded, setShowEnded] = useState(false);

  const running = open.filter((v) => v.stats.state === 'active');
  const habitsToday = running.reduce((acc, v) => acc + v.stats.today.total, 0);
  const doneToday = running.reduce((acc, v) => acc + v.stats.today.done, 0);
  const completedCount = ended.filter((v) => v.stats.state === 'completed').length;

  return (
    <div className="pb-nav pt-2 px-4 space-y-6">
      {/* Resumo */}
      <div className="card p-5 grid grid-cols-3 gap-4">
        <Stat value={running.length} label="Em curso" />
        <Stat value={doneToday} suffix={`/${habitsToday}`} label="Hoje" />
        <Stat value={profile.currentStreak} suffix="dias" label="Sequência" />
      </div>

      {/* Em andamento */}
      <section>
        <SectionHeader title="Em andamento" meta={open.length || undefined}>
          <button
            type="button"
            onClick={() => openStartChallengeModal()}
            className="icon-btn !bg-ink !text-bg"
            aria-label="Novo desafio"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </SectionHeader>

        {open.length > 0 ? (
          <div className="mt-2 space-y-2.5">
            {open.map((view) => (
              <ChallengeRow
                key={view.challenge.id}
                view={view}
                onOpen={() => openDetailModal(view.challenge.id)}
                onEdit={() => setEditing(view.challenge)}
              />
            ))}
          </div>
        ) : (
          <div className="card mt-2 px-5 py-8 text-center">
            <p className="text-[15px] font-semibold text-ink">Nenhum desafio em andamento</p>
            <p className="text-[13px] text-ink2 mt-1 max-w-xs mx-auto">
              Um desafio de hábitos (21, 30, 66 dias…) ou um quadro de operação para rotinas com muitas tarefas.
            </p>
            <button type="button" onClick={() => openStartChallengeModal()} className="btn btn-primary btn-sm mt-4">
              <Plus className="w-4 h-4" /> Novo desafio
            </button>
          </div>
        )}
        {open.length > 1 && (
          <p className="text-xs text-ink3 mt-3 px-1 flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" /> Os desafios correm juntos; cada um aparece em Hoje com os seus hábitos.
          </p>
        )}
      </section>

      {/* Encerrados */}
      {ended.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowEnded((v) => !v)}
            className="w-full flex items-center justify-between min-h-[2.75rem] px-1"
            aria-expanded={showEnded}
          >
            <span className="flex items-baseline gap-2">
              <span className="text-[17px] font-bold text-ink">Encerrados</span>
              <span className="text-[13px] text-ink3 tabular">
                {ended.length} · {completedCount} {completedCount === 1 ? 'concluído' : 'concluídos'}
              </span>
            </span>
            <ChevronDown className={`w-5 h-5 text-ink3 transition-transform ${showEnded ? 'rotate-180' : ''}`} />
          </button>
          {showEnded && (
            <div className="mt-2 space-y-2.5 animate-in fade-in">
              {ended.map((view) => (
                <ChallengeRow
                  key={view.challenge.id}
                  view={view}
                  onOpen={() => openDetailModal(view.challenge.id)}
                  onEdit={() => setEditing(view.challenge)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {editing && <EditChallengeModal isOpen onClose={() => setEditing(null)} challenge={editing} />}
    </div>
  );
};
