import React, { useState } from 'react';
import { useChallengeStore, buildSyncedOfficial66Challenge, generateChallengeDays } from '../../state/useChallengeStore';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { evaluateProtocolStatus } from '../../core/streakEngine';
import { UserChallenge } from '../../core/types';
import { ChallengeHabitCard } from './ChallengeHabitCard';
import { PillarId } from '../../theme/types';
import { getTodayString } from '../../core/streakEngine';
import { 
  X, 
  Target, 
  Flame, 
  Calendar, 
  Plus, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  Award,
  Layers,
  Zap,
  Map,
  CheckSquare
} from 'lucide-react';

interface ChallengeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: UserChallenge | null;
}

export const ChallengeDetailModal: React.FC<ChallengeDetailModalProps> = ({
  isOpen,
  onClose,
  challenge,
}) => {
  const { 
    toggleHabitDay, 
    removeHabitFromChallenge, 
    addHabitToChallenge, 
    deleteChallenge,
    toggleChallengeStatus 
  } = useChallengeStore();

  const { profile, openChallengeMapModal } = useUserStore();
  const { missions } = useHabitStore();

  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  const [newHabitColor, setNewHabitColor] = useState('#10b981');

  if (!isOpen || !challenge) return null;

  const todayStr = getTodayString();
  const isOfficial = challenge.isOfficial66 || challenge.id === 'challenge_official_66';

  // Se for o desafio oficial dos 66 dias, sincroniza 100% com o estado do motor de hábitos
  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const effectiveChallenge: UserChallenge = isOfficial
    ? buildSyncedOfficial66Challenge(profile, missions)
    : challenge;

  // Cálculo de dias e métricas
  const daysElapsed = isOfficial 
    ? protocolStatus.currentDay 
    : (() => {
        const startDate = new Date(effectiveChallenge.startDate + 'T00:00:00');
        const todayDate = new Date(todayStr + 'T00:00:00');
        const diffTime = Math.max(0, todayDate.getTime() - startDate.getTime());
        return Math.min(effectiveChallenge.targetDays, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
      })();

  const progressPercent = isOfficial
    ? protocolStatus.protocolProgressPercent
    : Math.min(100, Math.round((daysElapsed / effectiveChallenge.targetDays) * 100));

  const completedTodayCount = effectiveChallenge.habits.filter((h) => h.completedDates.includes(todayStr)).length;
  const totalHabits = effectiveChallenge.habits.length;

  // Total de execuções de missões no total do desafio x total de missões do desafio
  const totalPossibleChallengeMissions = effectiveChallenge.habits.length * effectiveChallenge.targetDays;
  const totalCompletedChallengeMissions = effectiveChallenge.habits.reduce((acc, habit) => {
    const habitDays = generateChallengeDays(effectiveChallenge.targetDays, effectiveChallenge.startDate, habit.completedDates);
    return acc + habitDays.filter((d) => d.isCompleted).length;
  }, 0);

  const handleCreateNewHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    addHabitToChallenge(effectiveChallenge.id, {
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
    if (window.confirm(`Deseja realmente excluir a missão/hábito "${habitTitle}"?`)) {
      removeHabitFromChallenge(effectiveChallenge.id, habitId);
    }
  };

  const handleDeleteChallenge = () => {
    if (window.confirm(`Tem certeza que deseja excluir o desafio "${effectiveChallenge.title}"? Esta ação não pode ser desfeita.`)) {
      deleteChallenge(effectiveChallenge.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Modal Card com Design Liquid Glass Fosco */}
      <div className="liquid-glass-card bg-slate-900/45 backdrop-blur-2xl border border-white/20 w-full max-w-5xl rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.35)] flex flex-col max-h-[92vh] my-auto relative z-[101]">
        {/* Efeito Sheen Superior Especular */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/60 via-shinobi-gold/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/30 pointer-events-none" />

        {/* Header Centralizado com Informações do Desafio */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-white/[0.02] backdrop-blur-xl relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isOfficial ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-shinobi-gold text-slate-950 text-[10px] font-extrabold uppercase tracking-wider shadow-glow-gold/40">
                    ⭐ MAIS POPULAR • FORMAÇÃO DE HÁBITO
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/10 text-[10px] font-mono font-bold">
                    {effectiveChallenge.category || 'Desafio Pessoal'}
                  </span>
                )}

                {isOfficial && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-shinobi-gold border border-shinobi-gold/40 text-[10px] font-mono font-bold">
                    Ciclo #{profile.activeChallenge?.cycleNumber || 1} • {protocolStatus.phaseName} (Fase {protocolStatus.phaseIndex})
                  </span>
                )}

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  effectiveChallenge.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                }`}>
                  {effectiveChallenge.status === 'completed' ? 'CONCLUÍDO 🏆' : 'EM ANDAMENTO ⚡'}
                </span>
              </div>

              <h2 className="font-cinzel text-lg sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                <span>{effectiveChallenge.title}</span>
              </h2>

              {effectiveChallenge.description && (
                <p className="text-xs text-slate-300 line-clamp-1 max-w-2xl">
                  {effectiveChallenge.description}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Progresso & Métricas do Desafio Sincronizadas */}
          <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {/* Indicador 1: Dia Atual */}
            <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px]">Dia Atual</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm sm:text-base">
                Dia {daysElapsed} / {effectiveChallenge.targetDays} ({progressPercent}%)
              </span>
            </div>

            {/* Indicador 2: Missões concluídas no total do desafio x total de missões do desafio */}
            <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-shinobi-gold/40 shadow-glow-gold/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px] flex items-center justify-center gap-1">
                <CheckSquare className="w-3 h-3 text-emerald-400" />
                <span>Missões no Desafio</span>
              </span>
              <span className="font-bold text-emerald-400 font-mono text-sm sm:text-base">
                {totalCompletedChallengeMissions} / {totalPossibleChallengeMissions}
              </span>
            </div>

            {/* Indicador 3: Missões Hoje */}
            <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px]">Missões Concluídas Hoje</span>
              <span className="font-bold text-cyan-400 font-mono text-sm sm:text-base">
                {completedTodayCount} / {totalHabits}
              </span>
            </div>

            {/* Indicador 4: Dias Restantes */}
            <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px]">Dias Restantes</span>
              <span className="font-bold text-rose-400 font-mono text-sm sm:text-base">
                {Math.max(0, effectiveChallenge.targetDays - daysElapsed)} dias
              </span>
            </div>
          </div>

          {/* Barra Visual de Dias */}
          <div className="mt-2.5 w-full h-2 bg-slate-950/60 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-shinobi-gold via-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Lista de Hábitos do Desafio (Exibição em Quadros lado a lado) */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-shinobi-gold" />
              <h3 className="font-cinzel text-xs sm:text-sm font-bold text-slate-100">
                Missões do Desafio ({effectiveChallenge.habits.length})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {isOfficial && (
                <button
                  type="button"
                  onClick={() => {
                    openChallengeMapModal();
                  }}
                  className="px-2.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-shinobi-gold text-xs font-bold rounded-xl border border-shinobi-gold/40 transition-all flex items-center gap-1 backdrop-blur-md"
                  title="Ver mapa dos 66 dias"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mapa 66 Dias</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsAddingHabit(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-shinobi-crimson to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-glow-crimson transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nova Missão</span>
              </button>
            </div>
          </div>

          {/* Formulário Inline para Adicionar Novo Hábito */}
          {isAddingHabit && (
            <form
              onSubmit={handleCreateNewHabit}
              className="p-4 rounded-2xl bg-slate-950/60 border border-shinobi-gold/60 backdrop-blur-xl space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-shinobi-gold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Adicionar ao Desafio
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingHabit(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-1">
                  <input
                    type="text"
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                    placeholder="Nome da missão (Ex: Leitura)"
                    required
                    className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <input
                    type="text"
                    value={newHabitDesc}
                    onChange={(e) => setNewHabitDesc(e.target.value)}
                    placeholder="Meta (Ex: Ler 15 min por dia)"
                    className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-shinobi-gold"
                  />
                </div>

                <div className="sm:col-span-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={newHabitColor}
                    onChange={(e) => setNewHabitColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
                    title="Cor de destaque"
                  />
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-shinobi-gold hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all"
                  >
                    Salvar Missão
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Cards de Hábitos em Grid de 2 Colunas para visualização de múltiplos cards lado a lado */}
          {effectiveChallenge.habits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {effectiveChallenge.habits.map((habit) => (
                <ChallengeHabitCard
                  key={habit.id}
                  habit={habit}
                  targetDays={effectiveChallenge.targetDays}
                  startDate={effectiveChallenge.startDate}
                  onToggleDay={(dateStr) => toggleHabitDay(effectiveChallenge.id, habit.id, dateStr)}
                  onDelete={() => handleDeleteHabit(habit.id, habit.title)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white/[0.03] rounded-3xl border border-white/10 text-slate-400 text-xs space-y-2 backdrop-blur-md">
              <p>Nenhuma missão cadastrada neste desafio ainda.</p>
              <button
                onClick={() => setIsAddingHabit(true)}
                className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-shinobi-gold border border-shinobi-gold/50 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Primeira Missão
              </button>
            </div>
          )}
        </div>

        {/* Footer com Ações Globais */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] backdrop-blur-xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {!isOfficial && (
              <button
                type="button"
                onClick={handleDeleteChallenge}
                className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                title="Excluir desafio completo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Desafio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => toggleChallengeStatus(effectiveChallenge.id)}
              className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              {effectiveChallenge.status === 'completed' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reabrir Desafio</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Marcar como Concluído</span>
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all ml-auto"
          >
            Fechar Acompanhamento
          </button>
        </div>
      </div>
    </div>
  );
};
