import React, { useState } from 'react';
import { useHabitStore } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useChallengeViews, useLooseMissions } from '../../state/challengeSelectors';
import { AddMissionModal } from './AddMissionModal';
import { DailyCheckInCard } from './DailyCheckInCard';
import { ChallengeGroup, HabitList } from './ChallengeGroup';
import { BoardTodayCards } from '../challenges/board/BoardTodayCards';
import { WeekRecapBanner } from '../status/WeekSummary';
import { DailyScrollWidget } from '../cards/DailyScrollWidget';
import { MissionHistoryModal } from '../modals/MissionHistoryModal';
import { Mission } from '../../core/types';
import { isBoard } from '../../core/board';
import { Menu } from '../ui/kit';
import { Flag, History, Plus } from 'lucide-react';

interface MissionsViewProps {
  onOpenCard?: () => void;
}

type MissionDraft = Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>;

/**
 * Tela "Hoje": a meta do dia e, abaixo, cada desafio em andamento com os
 * seus próprios hábitos. Hábitos de desafios encerrados não aparecem aqui.
 */
export const MissionsView: React.FC<MissionsViewProps> = ({ onOpenCard }) => {
  const { addMission, updateMission } = useHabitStore();
  const openStartChallengeModal = useUserStore((s) => s.openStartChallengeModal);
  const openDetailModal = useChallengeStore((s) => s.openDetailModal);
  const { open } = useChallengeViews();
  const loose = useLooseMissions();

  // Modal de hábito: editar um existente ou criar em um desafio (null = avulso)
  const [editing, setEditing] = useState<Mission | null>(null);
  const [addTo, setAddTo] = useState<string | null | undefined>(undefined);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const isModalOpen = editing !== null || addTo !== undefined;

  const habitGroups = open.filter((v) => !isBoard(v.challenge));
  const boards = open.filter((v) => isBoard(v.challenge));
  const nothing = open.length === 0 && loose.length === 0;

  const closeModal = () => {
    setEditing(null);
    setAddTo(undefined);
  };

  const handleSave = (data: MissionDraft) => {
    if (editing) updateMission(editing.id, data);
    else addMission(data, addTo ?? null);
  };

  return (
    <div className="pb-nav pt-2 px-4 space-y-7">
      <DailyCheckInCard
        menuItems={[{ label: 'Histórico de missões', icon: History, onSelect: () => setIsHistoryOpen(true) }]}
      />

      {/* Resumo semanal: só no domingo e na segunda */}
      <WeekRecapBanner />

      {habitGroups.map((view) => (
        <ChallengeGroup
          key={view.challenge.id}
          view={view}
          onOpen={() => openDetailModal(view.challenge.id)}
          onAddHabit={() => setAddTo(view.challenge.id)}
          onEditHabit={setEditing}
        />
      ))}

      {boards.length > 0 && <BoardTodayCards />}

      {loose.length > 0 && (
        <section>
          <div className="flex items-start gap-2 px-1">
            <div className="min-w-0 flex-1">
              <div className="t-label">Fora de desafio</div>
              <h2 className="text-[19px] font-bold text-ink leading-tight mt-1.5">Hábitos avulsos</h2>
            </div>
            <div className="-mr-2">
              <Menu
                label="Opções dos hábitos avulsos"
                items={[
                  { label: 'Adicionar hábito avulso', icon: Plus, onSelect: () => setAddTo(null) },
                  { label: 'Começar um desafio com eles', icon: Flag, onSelect: () => openStartChallengeModal('loose') },
                ]}
              />
            </div>
          </div>
          <p className="px-1 mt-2 text-[13px] text-ink2">Contam para a meta do dia e a sequência, sem desafio.</p>
          <div className="mt-3">
            <HabitList
              missions={loose}
              onEdit={setEditing}
              deleteConfirm={(m) => `Excluir o hábito "${m.title}"?`}
            />
          </div>
        </section>
      )}

      {nothing ? (
        <section className="card px-5 py-8 text-center">
          <p className="text-[15px] font-semibold text-ink">Nenhum desafio em andamento</p>
          <p className="text-[13px] text-ink2 mt-1 max-w-xs mx-auto">
            Escolha a duração e os hábitos. Cada desafio aparece aqui com os seus hábitos do dia.
          </p>
          <button type="button" onClick={() => openStartChallengeModal()} className="btn btn-primary btn-sm mt-4">
            <Plus className="w-4 h-4" /> Novo desafio
          </button>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => openStartChallengeModal()}
          className="btn btn-ghost w-full"
        >
          <Plus className="w-4 h-4" /> Novo desafio
        </button>
      )}

      {/* Ensinamento do dia */}
      <DailyScrollWidget onNavigateToScrolls={onOpenCard} />

      <AddMissionModal
        key={editing ? `edit_${editing.id}` : `new_${addTo ?? 'loose'}`}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        initialData={editing}
      />
      <MissionHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
};
