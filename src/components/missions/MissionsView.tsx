import React, { useState, useEffect } from 'react';
import { useHabitStore } from '../../state/useHabitStore';
import { useUIStore } from '../../state/useUIStore';
import { getTimeUntilMidnightString } from '../../core/dailyResetEngine';
import { MissionCard } from './MissionCard';
import { AddMissionModal } from './AddMissionModal';
import { DailyCheckInCard } from './DailyCheckInCard';
import { DailyScrollWidget } from '../cards/DailyScrollWidget';
import { MissionHistoryModal } from '../modals/MissionHistoryModal';
import { Mission, TimeOfDay } from '../../core/types';
import { PillarId } from '../../theme/types';
import { Menu, SectionHeader, Segmented, pillarColor } from '../ui/kit';
import { CheckCheck, ChevronDown, History, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';

interface MissionsViewProps {
  onOpenCard?: () => void;
}

const PILLARS: { id: PillarId | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'taijutsu', label: 'Corpo' },
  { id: 'ninjutsu', label: 'Mente' },
  { id: 'chakra', label: 'Disciplina' },
  { id: 'espirito', label: 'Confiança' },
  { id: 'genjutsu', label: 'Foco' },
];

const TIMES: { id: TimeOfDay | 'all'; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'morning', label: 'Manhã' },
  { id: 'afternoon', label: 'Tarde' },
  { id: 'evening', label: 'Noite' },
];

export const MissionsView: React.FC<MissionsViewProps> = ({ onOpenCard }) => {
  const {
    missions,
    filterPillar,
    filterTimeOfDay,
    searchQuery,
    setFilterPillar,
    setFilterTimeOfDay,
    setSearchQuery,
    toggleCompleteMission,
    addMission,
    updateMission,
    deleteMission,
    reorderMissions,
    moveMission,
    completeAllMissionsToday,
    uncompleteAllMissionsToday,
  } = useHabitStore();

  const {
    isMissionFiltersOpen,
    toggleMissionFilters,
    isCompletedMissionsCollapsed,
    toggleCompletedMissions,
  } = useUIStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [draggedMissionId, setDraggedMissionId] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnightString());

  useEffect(() => {
    const timer = setInterval(() => setTimeUntilReset(getTimeUntilMidnightString()), 30000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = missions.filter((m) => m.isCompletedToday).length;
  const totalCount = missions.length;
  const hasActiveFilter = filterPillar !== 'all' || filterTimeOfDay !== 'all' || searchQuery.trim() !== '';

  const filteredMissions = missions.filter((m) => {
    if (filterPillar !== 'all' && m.pillarId !== filterPillar) return false;
    if (filterTimeOfDay !== 'all' && m.timeOfDay !== filterTimeOfDay) return false;
    if (searchQuery.trim() && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const pendingMissions = filteredMissions.filter((m) => !m.isCompletedToday);
  const completedMissions = filteredMissions.filter((m) => m.isCompletedToday);

  const handleDrop = (targetId: string) => {
    if (draggedMissionId && draggedMissionId !== targetId) {
      const currentIndex = missions.findIndex((m) => m.id === draggedMissionId);
      const targetIndex = missions.findIndex((m) => m.id === targetId);
      if (currentIndex !== -1 && targetIndex !== -1) {
        const next = [...missions];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, moved);
        reorderMissions(next);
      }
    }
    setDraggedMissionId(null);
  };

  const handleEdit = (mission: Mission) => {
    setEditingMission(mission);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>) => {
    if (editingMission) updateMission(editingMission.id, data);
    else addMission(data);
  };

  const clearFilters = () => {
    setFilterPillar('all');
    setFilterTimeOfDay('all');
    setSearchQuery('');
  };

  const pendingIds = pendingMissions.map((m) => m.id);

  return (
    <div className="pb-nav pt-2 px-4 space-y-6">
      {/* Desafio em curso + meta do dia */}
      <DailyCheckInCard />

      {/* Missões */}
      <section>
        <SectionHeader title="Missões" meta={`${completedCount} de ${totalCount}`}>
          <button
            type="button"
            onClick={toggleMissionFilters}
            className={`icon-btn relative ${isMissionFiltersOpen ? '!text-ink bg-surface2' : ''}`}
            aria-label="Filtrar missões"
            aria-expanded={isMissionFiltersOpen}
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
            {hasActiveFilter && <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent" />}
          </button>
          <Menu
            label="Opções das missões"
            items={[
              {
                label: 'Concluir todas',
                icon: CheckCheck,
                hidden: pendingMissions.length === 0,
                onSelect: () => {
                  if (window.confirm('Marcar todas as missões pendentes como concluídas hoje?')) completeAllMissionsToday();
                },
              },
              {
                label: 'Desmarcar todas',
                icon: RotateCcw,
                hidden: completedMissions.length === 0,
                onSelect: () => {
                  if (window.confirm('Desmarcar todas as missões concluídas de hoje?')) uncompleteAllMissionsToday();
                },
              },
              { label: 'Histórico de missões', icon: History, onSelect: () => setIsHistoryModalOpen(true) },
            ]}
          />
          <button
            type="button"
            onClick={() => {
              setEditingMission(null);
              setIsModalOpen(true);
            }}
            className="icon-btn !bg-ink !text-bg ml-1"
            aria-label="Nova missão"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </SectionHeader>

        {isMissionFiltersOpen && (
          <div className="mt-2 mb-3 space-y-2.5 animate-in fade-in">
            <div className="relative">
              <Search className="w-4 h-4 text-ink3 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar missão"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field !pl-10"
              />
            </div>
            <Segmented options={TIMES} value={filterTimeOfDay} onChange={setFilterTimeOfDay} />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
              {PILLARS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilterPillar(p.id)}
                  className={`chip !h-8 ${filterPillar === p.id ? 'chip-on' : ''}`}
                >
                  {p.id !== 'all' && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: pillarColor(p.id) }} />
                  )}
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card mt-2 divide-y divide-line overflow-hidden">
          {pendingMissions.map((mission, idx) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onToggle={() => toggleCompleteMission(mission.id)}
              onEdit={() => handleEdit(mission)}
              onDelete={() => deleteMission(mission.id)}
              onMoveUp={() => moveMission(mission.id, 'up', pendingIds)}
              onMoveDown={() => moveMission(mission.id, 'down', pendingIds)}
              canMoveUp={idx > 0}
              canMoveDown={idx < pendingMissions.length - 1}
              draggable
              onDragStart={() => setDraggedMissionId(mission.id)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={() => setDraggedMissionId(null)}
              onDrop={() => handleDrop(mission.id)}
              isDragging={draggedMissionId === mission.id}
            />
          ))}

          {pendingMissions.length === 0 && (
            <div className="px-5 py-8 text-center">
              {totalCount === 0 ? (
                <>
                  <p className="text-[15px] font-semibold text-ink">Nenhuma missão ainda</p>
                  <p className="text-[13px] text-ink2 mt-1">Crie a primeira para definir a meta do seu dia.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMission(null);
                      setIsModalOpen(true);
                    }}
                    className="btn btn-primary btn-sm mt-4"
                  >
                    <Plus className="w-4 h-4" /> Nova missão
                  </button>
                </>
              ) : filteredMissions.length > 0 ? (
                <>
                  <p className="text-[15px] font-semibold text-ink">Tudo feito por hoje</p>
                  <p className="text-[13px] text-ink2 mt-1">As missões voltam em {timeUntilReset}.</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-ink2">Nenhuma missão para esses filtros.</p>
                  <button type="button" onClick={clearFilters} className="btn btn-ghost btn-sm mt-3">
                    Limpar filtros
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {completedMissions.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={toggleCompletedMissions}
              className="w-full flex items-center justify-between min-h-[2.5rem]"
              aria-expanded={!isCompletedMissionsCollapsed}
            >
              <span className="flex items-baseline gap-2">
                <span className="t-label">Concluídas</span>
                <span className="text-xs text-ink3 tabular">{completedMissions.length}</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-ink3 transition-transform ${isCompletedMissionsCollapsed ? '' : 'rotate-180'}`}
              />
            </button>
            {!isCompletedMissionsCollapsed && (
              <div className="card mt-1 divide-y divide-line overflow-hidden">
                {completedMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onToggle={() => toggleCompleteMission(mission.id)}
                    onEdit={() => handleEdit(mission)}
                    onDelete={() => deleteMission(mission.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Ensinamento do dia */}
      <DailyScrollWidget onNavigateToScrolls={onOpenCard} />

      <AddMissionModal
        key={editingMission ? `edit_${editingMission.id}` : 'create_new_mission'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMission(null);
        }}
        onSave={handleSaveModal}
        initialData={editingMission}
      />
      <MissionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
    </div>
  );
};
