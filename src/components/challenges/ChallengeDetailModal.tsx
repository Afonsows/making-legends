import React, { useState } from 'react';
import { useChallengeStore, buildSyncedOfficial66Challenge, generateChallengeDays } from '../../state/useChallengeStore';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { evaluateProtocolStatus, getTodayString } from '../../core/streakEngine';
import { UserChallenge } from '../../core/types';
import { ChallengeHabitCard } from './ChallengeHabitCard';
import { EditChallengeModal } from './EditChallengeModal';
import { getChallengeProgress } from './ChallengesView';
import { Bar, Menu, SectionHeader, Stat } from '../ui/kit';
import { CheckCircle2, Map, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';

interface ChallengeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge | null;
}

const STATUS_LABEL: Record<UserChallenge['status'], string> = {
  active: 'Em andamento',
  completed: 'Concluído',
  paused: 'Aguardando início',
  archived: 'Arquivado',
};

/** Acompanhamento de um desafio: resumo no topo e um cartão por hábito. */
export const ChallengeDetailModal: React.FC<ChallengeDetailModalProps> = ({ isOpen, onClose, challenge }) => {
  const {
    toggleHabitDay,
    removeHabitFromChallenge,
    addHabitToChallenge,
    updateHabit,
    deleteChallenge,
    toggleChallengeStatus,
  } = useChallengeStore();
  const { profile, openChallengeMapModal, openStartChallengeModal, deleteActiveChallenge } = useUserStore();
  const { missions } = useHabitStore();

  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  const [newHabitColor, setNewHabitColor] = useState('#10b981');
  const [toggleNotice, setToggleNotice] = useState<string | null>(null);

  if (!isOpen || !challenge) return null;

  const todayStr = getTodayString();
  const isOfficial = challenge.isOfficial66 || challenge.id === 'challenge_official_66';

  // O desafio principal é sempre lido do motor de hábitos (missões + perfil)
  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const current: UserChallenge = isOfficial ? buildSyncedOfficial66Challenge(profile, missions) : challenge;
  const awaitingStart = isOfficial && (!profile.activeChallenge || current.status === 'paused');

  const daysElapsed = isOfficial ? protocolStatus.currentDay : getChallengeProgress(current, todayStr).daysElapsed;
  const progressPercent = isOfficial
    ? protocolStatus.protocolProgressPercent
    : getChallengeProgress(current, todayStr).percent;

  const totalHabits = current.habits.length;
  const completedTodayCount = current.habits.filter((h) => h.completedDates.includes(todayStr)).length;
  const totalPossible = totalHabits * current.targetDays;
  const totalCompleted = current.habits.reduce(
    (acc, habit) =>
      acc + generateChallengeDays(current.targetDays, current.startDate, habit.completedDates).filter((d) => d.isCompleted).length,
    0
  );
  const adherence = totalHabits > 0 && daysElapsed > 0 ? Math.round((totalCompleted / (totalHabits * daysElapsed)) * 100) : 0;

  const handleCreateNewHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    addHabitToChallenge(current.id, {
      title: newHabitTitle.trim(),
      description: newHabitDesc.trim(),
      color: newHabitColor,
      pillarId: 'chakra',
    });
    setNewHabitTitle('');
    setNewHabitDesc('');
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = (habitId: string, habitTitle: string) => {
    if (window.confirm(`Excluir o hábito "${habitTitle}"?`)) removeHabitFromChallenge(current.id, habitId);
  };

  const handleDeleteChallenge = () => {
    if (isOfficial) {
      if (
        window.confirm(
          'Excluir o desafio ativo? As marcações, os dias cumpridos e as recompensas (XP e Ryō) obtidos desde o início dele serão desfeitos. Esta ação não pode ser revertida.'
        )
      ) {
        deleteActiveChallenge();
        onClose();
      }
    } else if (window.confirm(`Excluir o desafio "${current.title}"? Todos os hábitos dele serão removidos.`)) {
      deleteChallenge(current.id);
      onClose();
    }
  };

  return (
    <>
      <div className="modal-overlay z-[90] animate-in fade-in" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onClick={(e) => e.stopPropagation()}
          className="modal-panel w-full max-w-2xl bg-bg border border-line rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom"
        >
          {/* Cabeçalho */}
          <div className="px-5 pt-5 pb-4 border-b border-line">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className={`t-label ${current.status === 'completed' ? '!text-ok' : ''}`}>
                  {STATUS_LABEL[current.status]}
                  {isOfficial && profile.activeChallenge && ` · Ciclo ${profile.activeChallenge.cycleNumber || 1}`}
                </div>
                <h2 className="t-title text-[26px] text-ink mt-2.5">{current.title}</h2>
              </div>
              <div className="flex items-center shrink-0 -mt-1.5 -mr-2">
                <Menu
                  label="Opções do desafio"
                  items={[
                    { label: 'Mapa do desafio', icon: Map, onSelect: openChallengeMapModal, hidden: !isOfficial || awaitingStart },
                    { label: 'Editar desafio', icon: Pencil, onSelect: () => setIsEditModalOpen(true) },
                    {
                      label: current.status === 'completed' ? 'Reabrir desafio' : 'Marcar como concluído',
                      icon: current.status === 'completed' ? RotateCcw : CheckCircle2,
                      onSelect: () => toggleChallengeStatus(current.id),
                      hidden: isOfficial,
                    },
                    { label: 'Excluir desafio', icon: Trash2, onSelect: handleDeleteChallenge, danger: true, hidden: awaitingStart },
                  ]}
                />
                <button type="button" onClick={onClose} className="icon-btn" aria-label="Fechar">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {current.description && !isOfficial && <p className="text-sm text-ink2 mt-2 leading-snug">{current.description}</p>}
          </div>

          <div className="overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
            {/* Resumo */}
            {awaitingStart ? (
              <div className="card p-5">
                <p className="text-sm text-ink2 leading-snug">
                  Monte suas missões, escolha a duração e inicie quando estiver pronto.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openStartChallengeModal();
                  }}
                  className="btn btn-primary w-full mt-4"
                >
                  Iniciar desafio
                </button>
              </div>
            ) : (
              <div className="card p-5">
                <div className="flex items-baseline gap-2">
                  <span className="t-label">Dia</span>
                  <span className="t-num text-[44px] text-ink">{daysElapsed}</span>
                  <span className="t-num text-lg text-ink3">/{current.targetDays}</span>
                </div>
                <Bar value={progressPercent} className="mt-3.5" />
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-line">
                  <Stat value={completedTodayCount} suffix={`/${totalHabits}`} label="Hoje" />
                  <Stat value={`${adherence}%`} label="Adesão" />
                  <Stat value={Math.max(0, current.targetDays - daysElapsed)} label="Restam" />
                </div>
                <p className="text-xs text-ink3 mt-4 tabular">
                  {totalCompleted} de {totalPossible} marcações possíveis no desafio inteiro.
                </p>
              </div>
            )}

            {toggleNotice && (
              <div className="card px-4 py-3 text-[13px] text-ink border-warn/50" role="status">
                {toggleNotice}
              </div>
            )}

            {/* Hábitos */}
            <section>
              <SectionHeader title={isOfficial ? 'Missões' : 'Hábitos'} meta={totalHabits}>
                <button
                  type="button"
                  onClick={() => setIsAddingHabit((v) => !v)}
                  className="icon-btn !bg-ink !text-bg"
                  aria-label="Adicionar hábito"
                >
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </SectionHeader>

              {isAddingHabit && (
                <form onSubmit={handleCreateNewHabit} className="card p-4 mt-2 space-y-2.5 animate-in fade-in">
                  <input
                    type="text"
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                    placeholder="Nome (ex.: Leitura)"
                    className="field"
                    required
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newHabitDesc}
                    onChange={(e) => setNewHabitDesc(e.target.value)}
                    placeholder="Descrição (opcional)"
                    className="field"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-[13px] text-ink2 mr-auto">
                      <input
                        type="color"
                        value={newHabitColor}
                        onChange={(e) => setNewHabitColor(e.target.value)}
                        className="w-9 h-9 rounded-lg bg-transparent border border-line cursor-pointer"
                        aria-label="Cor do hábito"
                      />
                      Cor
                    </label>
                    <button type="button" onClick={() => setIsAddingHabit(false)} className="btn btn-ghost btn-sm">
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-solid btn-sm">
                      Adicionar
                    </button>
                  </div>
                </form>
              )}

              {totalHabits > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                  {current.habits.map((habit) => (
                    <ChallengeHabitCard
                      key={habit.id}
                      habit={habit}
                      targetDays={current.targetDays}
                      startDate={current.startDate}
                      onToggleDay={(dateStr) => {
                        const res = toggleHabitDay(current.id, habit.id, dateStr);
                        if (res.blockedReason) {
                          setToggleNotice(res.blockedReason);
                          setTimeout(() => setToggleNotice(null), 3500);
                        }
                      }}
                      onDelete={() => handleDeleteHabit(habit.id, habit.title)}
                      onEdit={(updates) => updateHabit(current.id, habit.id, updates)}
                    />
                  ))}
                </div>
              ) : (
                !isAddingHabit && (
                  <div className="card mt-2 px-5 py-8 text-center">
                    <p className="text-[13px] text-ink2">Nenhum hábito neste desafio ainda.</p>
                    <button type="button" onClick={() => setIsAddingHabit(true)} className="btn btn-ghost btn-sm mt-3">
                      <Plus className="w-4 h-4" /> Adicionar o primeiro
                    </button>
                  </div>
                )
              )}
            </section>
          </div>
        </div>
      </div>

      <EditChallengeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        challenge={current}
        onDeleted={() => onClose()}
      />
    </>
  );
};
