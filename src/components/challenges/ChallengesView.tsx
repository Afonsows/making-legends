import React, { useState } from 'react';
import { useChallengeStore, buildSyncedOfficial66Challenge } from '../../state/useChallengeStore';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { evaluateProtocolStatus, getTodayString } from '../../core/streakEngine';
import { CreateChallengeModal } from './CreateChallengeModal';
import { ChallengeDetailModal } from './ChallengeDetailModal';
import { EditChallengeModal } from './EditChallengeModal';
import { UserChallenge } from '../../core/types';
import { Bar, Menu, SectionHeader, Stat } from '../ui/kit';
import { ChevronRight, History, Map, Pencil, Plus, Trash2 } from 'lucide-react';

/** Dia corrente e percentual de um desafio personalizado. */
export function getChallengeProgress(challenge: Pick<UserChallenge, 'startDate' | 'targetDays'>, today: string) {
  const start = new Date(challenge.startDate + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');
  const diff = Math.max(0, now.getTime() - start.getTime());
  const daysElapsed = Math.min(challenge.targetDays, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  const percent = Math.min(100, Math.round((daysElapsed / challenge.targetDays) * 100));
  return { daysElapsed, percent };
}

export const ChallengesView: React.FC = () => {
  const {
    challenges,
    isCreateModalOpen,
    isDetailModalOpen,
    selectedChallengeForModal,
    openCreateModal,
    closeCreateModal,
    openDetailModal,
    closeDetailModal,
    deleteChallenge,
  } = useChallengeStore();

  const {
    profile,
    openChallengeMapModal,
    openChallengeHistoryModal,
    openStartChallengeModal,
    deleteActiveChallenge,
  } = useUserStore();
  const { missions } = useHabitStore();

  const [editingChallenge, setEditingChallenge] = useState<UserChallenge | null>(null);

  const todayStr = getTodayString();
  const status = evaluateProtocolStatus(profile, missions);
  const official = buildSyncedOfficial66Challenge(profile, missions);
  const customChallenges = challenges.filter((c) => !c.isOfficial66 && c.id !== 'challenge_official_66');

  const activeCount = (status.hasActiveChallenge ? 1 : 0) + customChallenges.filter((c) => c.status === 'active').length;
  const habitsCount = missions.length + customChallenges.reduce((acc, c) => acc + (c.habits?.length || 0), 0);
  const doneToday = missions.filter((m) => m.isCompletedToday).length;
  const daysCompleted = profile.activeChallenge?.daysCompleted ?? 0;

  const handleDeleteOfficial = () => {
    if (
      window.confirm(
        'Excluir o desafio ativo? As marcações, os dias cumpridos e as recompensas (XP e Ryō) obtidos desde o início dele serão desfeitos. Esta ação não pode ser revertida.'
      )
    ) {
      deleteActiveChallenge();
    }
  };

  const handleDeleteCustom = (challenge: UserChallenge) => {
    if (window.confirm(`Excluir o desafio "${challenge.title}"? Todos os hábitos dele serão removidos.`)) {
      deleteChallenge(challenge.id);
    }
  };

  return (
    <div className="pb-nav pt-2 px-4 space-y-6">
      {/* Resumo */}
      <div className="card p-5 grid grid-cols-3 gap-4">
        <Stat value={activeCount} label="Ativos" />
        <Stat value={habitsCount} label="Hábitos" />
        <Stat value={profile.currentStreak} suffix="dias" label="Sequência" />
      </div>

      {/* Desafio principal */}
      <section>
        <SectionHeader title="Desafio principal">
          <Menu
            label="Opções do desafio principal"
            items={[
              { label: 'Mapa do desafio', icon: Map, onSelect: openChallengeMapModal, hidden: !status.hasActiveChallenge },
              { label: 'Histórico de ciclos', icon: History, onSelect: openChallengeHistoryModal },
              { label: 'Editar desafio', icon: Pencil, onSelect: () => setEditingChallenge(official), hidden: !status.hasActiveChallenge },
              { label: 'Excluir desafio', icon: Trash2, onSelect: handleDeleteOfficial, danger: true, hidden: !status.hasActiveChallenge },
            ]}
          />
        </SectionHeader>

        {status.hasActiveChallenge ? (
          <button
            type="button"
            onClick={() => openDetailModal('challenge_official_66')}
            className="card mt-2 w-full p-5 text-left block"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="t-label truncate">
                  Ciclo {profile.activeChallenge?.cycleNumber || 1} · {status.phaseName}
                  {profile.activeChallenge?.isEliteMode && <span className="text-accent"> · Elite</span>}
                </div>
                <h3 className="text-lg font-bold text-ink mt-2.5 leading-tight">{official.title}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-ink3 shrink-0 mt-0.5" />
            </div>

            <div className="flex items-baseline gap-2 mt-4">
              <span className="t-label">Dia</span>
              <span className="t-num text-[40px] text-ink">{status.currentDay}</span>
              <span className="t-num text-base text-ink3">/{status.targetDays}</span>
            </div>
            <Bar value={status.protocolProgressPercent} className="mt-3.5" />

            <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-line">
              <Stat value={daysCompleted} label="Cumpridos" />
              <Stat value={doneToday} suffix={`/${missions.length}`} label="Hoje" />
              <Stat value={status.totalDaysRemaining} label="Restam" />
            </div>
          </button>
        ) : (
          <div className="card mt-2 p-5">
            <h3 className="t-title text-[24px] text-ink">Nenhum desafio em curso</h3>
            <p className="text-sm text-ink2 mt-2 leading-snug">
              O desafio principal usa suas missões diárias. Cada dia com 50% do XP conta como presença.
            </p>
            <button type="button" onClick={openStartChallengeModal} className="btn btn-primary w-full mt-4">
              Iniciar desafio
            </button>
          </div>
        )}
      </section>

      {/* Desafios personalizados */}
      <section>
        <SectionHeader title="Seus desafios" meta={customChallenges.length || undefined}>
          <button type="button" onClick={openCreateModal} className="icon-btn !bg-ink !text-bg" aria-label="Criar desafio">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </SectionHeader>

        {customChallenges.length > 0 ? (
          <div className="mt-2 space-y-2.5">
            {customChallenges.map((challenge) => {
              const { daysElapsed, percent } = getChallengeProgress(challenge, todayStr);
              const total = challenge.habits?.length || 0;
              const done = challenge.habits?.filter((h) => h.completedDates.includes(todayStr)).length || 0;
              const completed = challenge.status === 'completed';
              return (
                <div
                  key={challenge.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetailModal(challenge.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openDetailModal(challenge.id)}
                  className="card p-4 cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-ink leading-snug">{challenge.title}</h3>
                      <div className="text-[13px] text-ink2 mt-1 tabular">
                        {completed ? (
                          <span className="text-ok font-semibold">Concluído</span>
                        ) : (
                          <>
                            Dia {daysElapsed} de {challenge.targetDays}
                          </>
                        )}
                        <span className="text-ink3">
                          {' '}
                          · {done}/{total} hoje
                        </span>
                      </div>
                    </div>
                    <div className="-mt-2 -mr-2" onClick={(e) => e.stopPropagation()}>
                      <Menu
                        label={`Opções de ${challenge.title}`}
                        items={[
                          { label: 'Editar desafio', icon: Pencil, onSelect: () => setEditingChallenge(challenge) },
                          { label: 'Excluir desafio', icon: Trash2, onSelect: () => handleDeleteCustom(challenge), danger: true },
                        ]}
                      />
                    </div>
                  </div>
                  <Bar value={percent} color={completed ? 'rgb(var(--ok))' : undefined} className="mt-3" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card mt-2 px-5 py-8 text-center">
            <p className="text-[15px] font-semibold text-ink">Nenhum desafio personalizado</p>
            <p className="text-[13px] text-ink2 mt-1 max-w-xs mx-auto">
              Crie um desafio de 21, 30, 90 dias ou mais, com hábitos próprios e marcação diária.
            </p>
            <button type="button" onClick={openCreateModal} className="btn btn-ghost btn-sm mt-4">
              <Plus className="w-4 h-4" /> Criar desafio
            </button>
          </div>
        )}
      </section>

      <CreateChallengeModal isOpen={isCreateModalOpen} onClose={closeCreateModal} />
      <ChallengeDetailModal isOpen={isDetailModalOpen} onClose={closeDetailModal} challenge={selectedChallengeForModal} />
      {editingChallenge && (
        <EditChallengeModal isOpen={!!editingChallenge} onClose={() => setEditingChallenge(null)} challenge={editingChallenge} />
      )}
    </div>
  );
};
