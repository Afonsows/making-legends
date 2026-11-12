import React, { useState, useEffect } from 'react';
import { useHabitStore } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { useUIStore } from '../../state/useUIStore';
import { useTheme } from '../../theme/ThemeContext';
import { evaluateProtocolStatus } from '../../core/streakEngine';
import { getTimeUntilMidnightString } from '../../core/dailyResetEngine';
import { MissionCard } from './MissionCard';
import { AddMissionModal } from './AddMissionModal';
import { DailyCheckInCard } from './DailyCheckInCard';
import { DailyScrollWidget } from '../cards/DailyScrollWidget';
import { MissionHistoryModal } from '../modals/MissionHistoryModal';
import { ChallengeMapModal } from '../modals/ChallengeMapModal';
import { ChallengeHistoryModal } from '../modals/ChallengeHistoryModal';
import { Mission, TimeOfDay } from '../../core/types';
import { PillarId } from '../../theme/types';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Compass, 
  CheckCircle2, 
  History, 
  Clock,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  CheckCheck,
  RotateCcw
} from 'lucide-react';

interface MissionsViewProps {
  onOpenCard?: () => void;
}

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
    profile, 
    isChallengeMapModalOpen, 
    closeChallengeMapModal,
    isChallengeHistoryModalOpen,
    closeChallengeHistoryModal 
  } = useUserStore();

  const {
    isCleanMode,
    toggleCleanMode,
    isPendingMissionsCollapsed,
    togglePendingMissions,
    isCompletedMissionsCollapsed,
    toggleCompletedMissions,
  } = useUIStore();

  const { getPhaseInfo, theme } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnightString());

  useEffect(() => {
    const updateCountdown = () => setTimeUntilReset(getTimeUntilMidnightString());
    const timer = setInterval(updateCountdown, 30000);
    return () => clearInterval(timer);
  }, []);

  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const currentPhase = getPhaseInfo(protocolStatus.currentDay);

  const completedCount = missions.filter((m) => m.isCompletedToday).length;
  const totalCount = missions.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtragem e Divisão Automática entre Pendentes e Concluídas
  const filteredMissions = missions.filter((m) => {
    if (filterPillar !== 'all' && m.pillarId !== filterPillar) return false;
    if (filterTimeOfDay !== 'all' && m.timeOfDay !== filterTimeOfDay) return false;
    if (searchQuery.trim() && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingMissions = filteredMissions.filter((m) => !m.isCompletedToday);
  const completedMissions = filteredMissions.filter((m) => m.isCompletedToday);
  const [draggedMissionId, setDraggedMissionId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedMissionId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedMissionId || draggedMissionId === targetId) {
      setDraggedMissionId(null);
      return;
    }

    const currentIndex = missions.findIndex((m) => m.id === draggedMissionId);
    const targetIndex = missions.findIndex((m) => m.id === targetId);

    if (currentIndex !== -1 && targetIndex !== -1) {
      const newMissions = [...missions];
      const [movedItem] = newMissions.splice(currentIndex, 1);
      newMissions.splice(targetIndex, 0, movedItem);
      reorderMissions(newMissions);
    }
    setDraggedMissionId(null);
  };

  const handleEdit = (mission: Mission) => {
    setEditingMission(mission);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: Omit<Mission, 'id' | 'isCompletedToday' | 'completedDates' | 'order' | 'createdAt'>) => {
    if (editingMission) {
      updateMission(editingMission.id, data);
    } else {
      addMission(data);
    }
  };

  const handleBatchCompleteAll = () => {
    if (window.confirm('Deseja marcar todas as missões pendentes como concluídas hoje?')) {
      completeAllMissionsToday();
    }
  };

  const handleBatchUncompleteAll = () => {
    if (window.confirm('Deseja desmarcar todas as missões concluídas de hoje?')) {
      uncompleteAllMissionsToday();
    }
  };

  const pillars: { id: PillarId | 'all'; label: string; shortLabel: string; icon?: string }[] = [
    { id: 'all', label: 'Todos os Pilares', shortLabel: 'Todos' },
    { id: 'taijutsu', label: 'Taijutsu (Corpo)', shortLabel: 'Taijutsu', icon: '🥋' },
    { id: 'ninjutsu', label: 'Ninjutsu (Mente)', shortLabel: 'Ninjutsu', icon: '📜' },
    { id: 'chakra', label: 'Chakra (Disciplina)', shortLabel: 'Chakra', icon: '⚡' },
    { id: 'espirito', label: 'Espírito (Confiança)', shortLabel: 'Espírito', icon: '🛡️' },
    { id: 'genjutsu', label: 'Genjutsu (Foco)', shortLabel: 'Genjutsu', icon: '👁️' },
  ];

  const times: { id: TimeOfDay | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos Horários' },
    { id: 'morning', label: 'Manhã' },
    { id: 'afternoon', label: 'Tarde' },
    { id: 'evening', label: 'Noite' },
  ];

  return (
    <div className="pb-nav pt-3 max-w-4xl mx-auto px-3 sm:px-4 space-y-3.5">
      {/* Card Principal: Presença Diária dos 66 Dias com Validação de 50% de XP */}
      <DailyCheckInCard />

      {/* Widget do Pergaminho de Sabedoria Desbloqueado do Dia */}
      <DailyScrollWidget />

      {/* Cartão de Progresso Diário e Chamada para Ação */}
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-shinobi-jade" />
            <h3 className="font-cinzel text-sm sm:text-base font-bold text-slate-100">
              Missões de Hoje ({completedCount}/{totalCount})
            </h3>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-36 sm:w-48 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-shinobi-chakra to-shinobi-jade transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-shinobi-gold">
              {completionPercentage}% Concluído
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-1">
            <Clock className="w-3 h-3 text-shinobi-gold" />
            <span>Ciclo diário fecha às 00:00 • Renovação em <strong className="text-shinobi-gold">{timeUntilReset}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/60 rounded-xl transition-all shadow-md flex items-center justify-center"
            title="Histórico & Sincronizar"
            aria-label="Histórico & Sincronizar"
          >
            <History className="w-4 h-4 text-amber-400" />
          </button>

          {onOpenCard && (
            <button
              onClick={onOpenCard}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/50 rounded-xl transition-all shadow-md flex items-center justify-center"
              title="Ensinamento Shinobi"
              aria-label="Ensinamento Shinobi"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
            </button>
          )}

          <button
            onClick={() => {
              setEditingMission(null);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-gradient-to-r from-shinobi-crimson to-rose-600 text-white font-bold text-xs rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center gap-1.5"
            title="Nova Missão"
            aria-label="Nova Missão"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Missão</span>
          </button>
        </div>
      </div>

      {/* Barra de Controles: Modo Clean e Ações Rápidas de Liberdade */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md flex-wrap">
        <div className="flex items-center gap-2">
          {/* Toggle Modo Clean */}
          <button
            type="button"
            onClick={toggleCleanMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isCleanMode
                ? 'bg-shinobi-gold text-slate-950 border-shinobi-gold shadow-glow-gold/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
            title={isCleanMode ? 'Desativar Modo Clean' : 'Ativar Modo Clean (Visual Compacto)'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isCleanMode ? 'Modo Clean: ON' : 'Modo Clean'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {pendingMissions.length > 0 && (
            <button
              type="button"
              onClick={handleBatchCompleteAll}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
              title="Concluir todas as missões pendentes de hoje"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Concluir Todas</span>
            </button>
          )}

          {completedMissions.length > 0 && (
            <button
              type="button"
              onClick={handleBatchUncompleteAll}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
              title="Desmarcar todas as missões concluídas de hoje"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Desmarcar Todas</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar missões e jutsus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-shinobi-crimson transition-colors shadow-md"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {times.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTimeOfDay(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all font-bold border ${
                  filterTimeOfDay === t.id
                    ? 'bg-rose-950/90 border-2 border-rose-500 text-rose-300 shadow-glow-crimson/30'
                    : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de Pilares */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {pillars.map((p) => {
            const isSelected = filterPillar === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setFilterPillar(p.id)}
                className={`py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 sm:gap-1.5 border font-semibold select-none active:scale-[0.98] ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-shinobi-gold text-shinobi-gold font-bold shadow-glow-gold/30 scale-[1.02]'
                    : 'bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/80'
                }`}
              >
                {p.icon && <span className="shrink-0 text-xs sm:text-sm">{p.icon}</span>}
                <span className="hidden sm:inline truncate">{p.label}</span>
                <span className="sm:hidden truncate">{p.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seção 1: Missões Pendentes / Em Andamento */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2 font-cinzel">
              <span className="w-2.5 h-2.5 rounded-full bg-shinobi-crimson animate-pulse shadow-glow-crimson" />
              <span>Missões em Andamento ({pendingMissions.length})</span>
            </h3>
            <button
              type="button"
              onClick={togglePendingMissions}
              className="p-1 text-slate-400 hover:text-slate-200"
              title={isPendingMissionsCollapsed ? 'Expandir missões pendentes' : 'Recolher missões pendentes'}
            >
              {isPendingMissionsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {pendingMissions.length > 1 && !isCleanMode && (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              Arraste ou use setas para priorizar
            </span>
          )}
        </div>

        {!isPendingMissionsCollapsed && (
          pendingMissions.length > 0 ? (
            <div className={`grid gap-2.5 sm:gap-3 ${isCleanMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {pendingMissions.map((mission, idx) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onToggle={() => toggleCompleteMission(mission.id)}
                  onEdit={() => handleEdit(mission)}
                  onDelete={() => deleteMission(mission.id)}
                  onMoveUp={() => moveMission(mission.id, 'up', pendingMissions.map((m) => m.id))}
                  onMoveDown={() => moveMission(mission.id, 'down', pendingMissions.map((m) => m.id))}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < pendingMissions.length - 1}
                  draggable={true}
                  onDragStart={() => handleDragStart(mission.id)}
                  onDragOver={handleDragOver}
                  onDragEnd={() => setDraggedMissionId(null)}
                  onDrop={() => handleDrop(mission.id)}
                  isDragging={draggedMissionId === mission.id}
                  isCleanMode={isCleanMode}
                />
              ))}
            </div>
          ) : filteredMissions.length > 0 ? (
            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-1 backdrop-blur-md">
              <div className="text-2xl animate-bounce">🏆</div>
              <h4 className="font-cinzel text-xs sm:text-sm font-bold text-emerald-300">
                Todas as Missões Concluídas!
              </h4>
              <p className="text-[11px] text-slate-300 max-w-md mx-auto">
                Parabéns! Seu protocolo diário foi cumprido com honra.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 p-5">
              <p className="text-xs text-slate-400 mb-2.5">
                Nenhuma missão encontrada para os filtros selecionados.
              </p>
              <button
                onClick={() => {
                  setFilterPillar('all');
                  setFilterTimeOfDay('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 bg-slate-800 border border-slate-700 text-xs text-shinobi-gold font-bold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          )
        )}
      </div>

      {/* Seção 2: Missões Concluídas Hoje */}
      {completedMissions.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between border-t-2 border-slate-800/80 pt-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-emerald-300 font-cinzel">
                  Missões Concluídas Hoje ({completedMissions.length}/{totalCount})
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleCompletedMissions}
              className="p-1 text-slate-400 hover:text-slate-200"
              title={isCompletedMissionsCollapsed ? 'Expandir missões concluídas' : 'Recolher missões concluídas'}
            >
              {isCompletedMissionsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!isCompletedMissionsCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {completedMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onToggle={() => toggleCompleteMission(mission.id)}
                  onEdit={() => handleEdit(mission)}
                  onDelete={() => deleteMission(mission.id)}
                  isCleanMode={isCleanMode}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Criação / Edição */}
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

      {/* Modal de Histórico & Auditoria de Missões */}
      <MissionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Modal do Mapa Visual dos 66 Dias */}
      <ChallengeMapModal
        isOpen={isChallengeMapModalOpen}
        onClose={closeChallengeMapModal}
      />

      {/* Modal da Área de Histórico de Desafios dos 66 Dias */}
      <ChallengeHistoryModal
        isOpen={isChallengeHistoryModalOpen}
        onClose={closeChallengeHistoryModal}
      />
    </div>
  );
};
