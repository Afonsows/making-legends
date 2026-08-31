import React, { useState } from 'react';
import { useHabitStore } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { evaluateProtocolStatus } from '../../core/streakEngine';
import { MissionCard } from './MissionCard';
import { AddMissionModal } from './AddMissionModal';
import { MissionHistoryModal } from '../modals/MissionHistoryModal';
import { Mission, TimeOfDay } from '../../core/types';
import { PillarId } from '../../theme/types';
import { 
  Plus, 
  Search, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  Compass, 
  Calendar,
  CheckCircle2,
  History
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
    deleteMission 
  } = useHabitStore();

  const { profile } = useUserStore();
  const { getPhaseInfo, theme } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const currentPhase = getPhaseInfo(protocolStatus.currentDay);

  const completedCount = missions.filter((m) => m.isCompletedToday).length;
  const totalCount = missions.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtragem
  const filteredMissions = missions.filter((m) => {
    if (filterPillar !== 'all' && m.pillarId !== filterPillar) return false;
    if (filterTimeOfDay !== 'all' && m.timeOfDay !== filterTimeOfDay) return false;
    if (searchQuery.trim() && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
    <div className="pb-24 pt-3 max-w-4xl mx-auto px-4 space-y-4">
      {/* Banner Superior: O Protocolo dos 66 Dias (Phillippa Lally) */}
      <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-shinobi-crimson/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-shinobi-crimson/20 text-shinobi-crimson font-bold border border-shinobi-crimson/40">
                Fase {currentPhase.phaseIndex} — {currentPhase.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {currentPhase.daysRange}
              </span>
            </div>

            <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>Dia {protocolStatus.currentDay} de 66</span>
              <span className="text-xs font-mono font-normal text-shinobi-gold">
                ({protocolStatus.totalDaysRemaining} dias para o Kage)
              </span>
            </h2>

            <p className="text-xs text-slate-300 mt-1 line-clamp-1 italic text-slate-400">
              "{currentPhase.quote}"
            </p>
          </div>

          {/* Progresso do Protocolo */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-shinobi-gold">
                {protocolStatus.protocolProgressPercent}% Concluído
              </div>
              <div className="text-[10px] text-slate-400">
                {protocolStatus.daysRemainingInPhase} dias p/ próxima fase
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-shinobi-gold/40 flex items-center justify-center bg-shinobi-bg/80 font-mono font-bold text-xs text-slate-100">
              {protocolStatus.currentDay}/66
            </div>
          </div>
        </div>

        {/* Barra de Progresso dos 66 Dias com 3 Fases Demarcadas */}
        <div className="mt-3 relative">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-shinobi-crimson via-shinobi-gold to-shinobi-jade transition-all duration-500 rounded-full"
              style={{ width: `${protocolStatus.protocolProgressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1 px-1">
            <span>Despertar (1-22)</span>
            <span>Forja (23-44)</span>
            <span>Mestria (45-66)</span>
          </div>
        </div>
      </div>

      {/* Cartão de Progresso Diário e Chamada para Ação */}
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-shinobi-jade" />
            <h3 className="font-cinzel text-sm sm:text-base font-bold text-slate-100">
              Missões de Hoje ({completedCount}/{totalCount})
            </h3>
          </div>
          <div className="flex items-center gap-3 mt-2">
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
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border-2 border-amber-500/60 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            title="Ver histórico de missões e sincronizar XP/Ryō"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Histórico & Sincronizar</span>
          </button>

          {onOpenCard && (
            <button
              onClick={onOpenCard}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border-2 border-cyan-500/50 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Ensinamento</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingMission(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-shinobi-crimson to-rose-600 text-white text-xs font-bold rounded-xl shadow-glow-crimson hover:opacity-95 transition-all flex items-center gap-1.5 ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Missão</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-2.5">
        {/* Barra de Busca e Filtro de Horário */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar missões e jutsus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-shinobi-crimson transition-colors shadow-md"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {times.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTimeOfDay(t.id)}
                className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all font-bold border ${
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

        {/* Filtro de Pilares: 3 em cima, 3 embaixo sem barra de rolagem (100% responsivo para Mobile PWA e Desktop) */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {pillars.map((p) => {
            const isSelected = filterPillar === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setFilterPillar(p.id)}
                className={`py-2 px-1.5 sm:px-2.5 rounded-xl text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 sm:gap-1.5 border font-semibold select-none active:scale-[0.98] ${
                  isSelected
                    ? 'bg-slate-900 border-2 border-shinobi-gold text-shinobi-gold font-bold shadow-glow-gold/30 scale-[1.02]'
                    : 'bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/80'
                }`}
              >
                {p.icon && <span className="flex-shrink-0 text-xs sm:text-sm">{p.icon}</span>}
                <span className="hidden sm:inline truncate">{p.label}</span>
                <span className="sm:hidden truncate">{p.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Missões em Formato de Cards (1 coluna em mobile compacto, 2 colunas a partir de sm: 640px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {filteredMissions.length > 0 ? (
          filteredMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onToggle={() => toggleCompleteMission(mission.id)}
              onEdit={() => handleEdit(mission)}
              onDelete={() => deleteMission(mission.id)}
            />
          ))
        ) : (
          <div className="col-span-1 md:col-span-2 text-center py-12 bg-slate-900/70 backdrop-blur-md rounded-3xl border border-slate-800 p-6">
            <p className="text-sm text-slate-400 mb-3">
              Nenhuma missão encontrada para os filtros selecionados.
            </p>
            <button
              onClick={() => {
                setFilterPillar('all');
                setFilterTimeOfDay('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-xs text-shinobi-gold font-bold rounded-xl hover:bg-slate-700 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição */}
      <AddMissionModal
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
    </div>
  );
};
