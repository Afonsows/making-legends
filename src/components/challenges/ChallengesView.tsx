import React, { useState } from 'react';
import { useChallengeStore, buildSyncedOfficial66Challenge, generateChallengeDays } from '../../state/useChallengeStore';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useUIStore } from '../../state/useUIStore';
import { evaluateProtocolStatus } from '../../core/streakEngine';
import { CreateChallengeModal } from './CreateChallengeModal';
import { ChallengeDetailModal } from './ChallengeDetailModal';
import { EditChallengeModal } from './EditChallengeModal';
import { getTodayString } from '../../core/streakEngine';
import { UserChallenge } from '../../core/types';
import {
  Trophy,
  Flame,
  Target,
  Plus,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Award,
  Map,
  CheckSquare,
  Edit3,
  Trash2,
} from 'lucide-react';

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

  const {
    isChallengesBannerCollapsed,
    toggleChallengesBanner,
    isMainChallengeCollapsed,
    toggleMainChallenge,
    isCustomChallengesCollapsed,
    toggleCustomChallenges,
  } = useUIStore();

  const [editingChallenge, setEditingChallenge] = useState<UserChallenge | null>(null);

  const todayStr = getTodayString();

  // Desafio Oficial dos 66 Dias
  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const official66 = buildSyncedOfficial66Challenge(profile, missions);

  // Outros desafios criados pelo usuário
  const customChallenges = challenges.filter((c) => !c.isOfficial66 && c.id !== 'challenge_official_66');

  const activeChallengesCount = (protocolStatus.hasActiveChallenge ? 1 : 0) + customChallenges.filter((c) => c.status === 'active').length;
  const completedChallengesCount = customChallenges.filter((c) => c.status === 'completed').length;
  const totalHabitsCount = missions.length + customChallenges.reduce((acc, c) => acc + (c.habits?.length || 0), 0);

  const calculateCustomChallengeProgress = (challenge: typeof customChallenges[0]) => {
    const start = new Date(challenge.startDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diff = Math.max(0, today.getTime() - start.getTime());
    const daysElapsed = Math.min(challenge.targetDays, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
    const percent = Math.min(100, Math.round((daysElapsed / challenge.targetDays) * 100));
    return { daysElapsed, percent };
  };

  const completedTodayMissionsCount = missions.filter((m) => m.isCompletedToday).length;

  const handleDeleteCustomChallenge = (e: React.MouseEvent, challenge: UserChallenge) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir o desafio "${challenge.title}"? Todos os hábitos associados serão removidos.`)) {
      deleteChallenge(challenge.id);
    }
  };

  const handleEditCustomChallenge = (e: React.MouseEvent, challenge: UserChallenge) => {
    e.stopPropagation();
    setEditingChallenge(challenge);
  };

  const handleDeleteActiveOfficialChallenge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        'Excluir o desafio ativo? As marcações, os dias cumpridos e as recompensas (XP e Ryō) obtidos desde o início dele serão desfeitos. Esta ação não pode ser revertida.'
      )
    ) {
      deleteActiveChallenge();
    }
  };

  const handleEditActiveOfficialChallenge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChallenge(official66);
  };

  return (
    <div className="pb-nav pt-3 max-w-4xl mx-auto px-3 sm:px-4 space-y-4">
      {/* Banner / Cabeçalho Liquid Glass da Aba Desafio (com Toggle Clean) */}
      <div className="liquid-glass-nav rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-2xl border border-white/20 transition-all">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-shinobi-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-shinobi-crimson/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Making Legends"
              className="w-10 h-10 rounded-2xl border border-shinobi-crimson/50 shadow-glow-crimson object-cover shrink-0 hidden sm:block"
            />
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-shinobi-gold/20 border border-shinobi-gold/40 text-shinobi-gold text-[10px] font-mono font-bold">
                <Trophy className="w-3 h-3" />
                <span>DESAFIOS & HÁBITOS</span>
              </div>
              <h1 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100">
                Desafios & Maestria
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-2 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all duration-300 flex items-center justify-center gap-1.5 group shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3] group-hover:rotate-90 transition-transform" />
              <span className="hidden sm:inline">Criar Desafio</span>
              <span className="sm:hidden">Novo</span>
            </button>

            <button
              type="button"
              onClick={toggleChallengesBanner}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-white/10 transition-colors"
              title={isChallengesBannerCollapsed ? 'Expandir Resumo' : 'Recolher Resumo (Clean)'}
            >
              {isChallengesBannerCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Métricas Rápidas (Ocultáveis no modo Clean) */}
        {!isChallengesBannerCollapsed && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center relative z-10 animate-in fade-in duration-200">
            <div className="p-2 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px]">Desafios Ativos</span>
              <span className="font-mono font-bold text-shinobi-gold text-sm sm:text-base">
                {activeChallengesCount}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px]">Missões / Hábitos</span>
              <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                {totalHabitsCount}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px]">Ofensiva Geral</span>
              <span className="font-mono font-bold text-cyan-400 text-sm sm:text-base">
                {profile.currentStreak} dias
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Seção 1: Desafio Oficial de 66 Dias */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-cinzel text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-shinobi-gold" />
              <span>Desafio Principal</span>
            </h2>
            <button
              type="button"
              onClick={toggleMainChallenge}
              className="text-slate-400 hover:text-slate-200 p-1"
              title={isMainChallengeCollapsed ? 'Expandir Desafio Principal' : 'Recolher Desafio Principal'}
            >
              {isMainChallengeCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openChallengeHistoryModal}
              className="text-[11px] font-mono text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Histórico</span>
            </button>

            {protocolStatus.hasActiveChallenge && (
              <button
                type="button"
                onClick={openChallengeMapModal}
                className="text-[11px] font-mono text-shinobi-gold hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mapa</span>
              </button>
            )}
          </div>
        </div>

        {protocolStatus.hasActiveChallenge ? (
          isMainChallengeCollapsed ? (
            /* Versão Clean / Recolhida do Desafio Ativo */
            <div
              onClick={() => openDetailModal('challenge_official_66')}
              className="pergaminho-bg rounded-2xl border border-shinobi-gold/60 p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-shinobi-gold transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-shinobi-gold animate-pulse shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-slate-100 text-xs sm:text-sm truncate block">
                    {official66.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Dia {protocolStatus.currentDay} / {protocolStatus.targetDays} ({protocolStatus.protocolProgressPercent}%) • {protocolStatus.totalDaysRemaining}d restantes
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleEditActiveOfficialChallenge}
                  className="p-1.5 text-slate-400 hover:text-shinobi-gold rounded-lg hover:bg-white/10 transition-colors"
                  title="Editar desafio"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteActiveOfficialChallenge}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                  title="Cancelar e excluir desafio ativo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ) : (
            /* Versão Completa */
            <div className="pergaminho-bg rounded-3xl border-2 border-shinobi-gold p-4 sm:p-5 relative overflow-hidden shadow-2xl space-y-4">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-shinobi-gold via-white to-transparent pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-gradient-to-r from-amber-500 to-shinobi-gold text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-glow-gold/40 animate-pulse">
                      ⭐ DESAFIO PRINCIPAL
                    </span>
                    <span className="text-[10px] font-mono font-bold text-shinobi-gold bg-slate-950/80 px-2 py-0.5 rounded-full border border-shinobi-gold/40">
                      Ciclo #{profile.activeChallenge?.cycleNumber || 1} • {protocolStatus.phaseName}
                    </span>
                  </div>

                  <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 truncate">
                    {official66.title}
                  </h3>

                  <p className="text-xs text-slate-300 max-w-xl">
                    Suas missões diárias da tela inicial. Cada dia com 50% do XP conta como presença.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleEditActiveOfficialChallenge}
                    className="p-2 bg-slate-900/90 hover:bg-slate-800 text-shinobi-gold border border-shinobi-gold/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    title="Editar título e duração do desafio"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteActiveOfficialChallenge}
                    className="p-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    title="Cancelar e excluir o desafio ativo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Excluir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDetailModal('challenge_official_66')}
                    className="px-4 py-2 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all duration-300 flex items-center gap-1"
                  >
                    <span>Acompanhar</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Barra de Progresso e Estatísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs relative z-10">
                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Dia Atual</span>
                  <span className="font-bold text-shinobi-gold font-mono text-xs sm:text-sm">
                    Dia {protocolStatus.currentDay} / {protocolStatus.targetDays}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/80 border border-shinobi-gold/40 shadow-glow-gold/10">
                  <span className="text-slate-400 block text-[10px] flex items-center justify-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-400" />
                    <span>Missões</span>
                  </span>
                  <span className="font-bold text-emerald-400 font-mono text-xs sm:text-sm">
                    {missions.reduce((acc, m) => {
                      const days = generateChallengeDays(protocolStatus.targetDays, profile.activeChallenge?.startDate, m.completedDates);
                      return acc + days.filter((d) => d.isCompleted).length;
                    }, 0)} / {missions.length * protocolStatus.targetDays}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Feitas Hoje</span>
                  <span className="font-bold text-cyan-400 font-mono text-xs sm:text-sm">
                    {completedTodayMissionsCount} / {missions.length}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Restantes</span>
                  <span className="font-bold text-rose-400 font-mono text-xs sm:text-sm">
                    {protocolStatus.totalDaysRemaining} dias
                  </span>
                </div>
              </div>

              {/* Barra Visual */}
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative z-10">
                <div
                  className="h-full bg-gradient-to-r from-shinobi-gold via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${protocolStatus.protocolProgressPercent}%` }}
                />
              </div>
            </div>
          )
        ) : (
          /* Sugestão de Novo Ciclo quando não há ativo */
          <div className="pergaminho-bg rounded-3xl border-2 border-shinobi-gold/70 p-4 sm:p-5 relative overflow-hidden shadow-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <span className="bg-gradient-to-r from-amber-500 to-shinobi-gold text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-glow-gold/40">
                  ⭐ NOVO CICLO #{(profile.challengeHistory?.length || 0) + 1}
                </span>
                <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100">
                  Desafio de 66 Dias — Formação de Hábitos
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Escolha suas missões e a duração para forjar disciplina inabalável.
                </p>
              </div>

              <button
                type="button"
                onClick={openStartChallengeModal}
                className="px-5 py-2.5 bg-gradient-to-r from-shinobi-gold via-amber-400 to-emerald-400 hover:opacity-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-glow-gold transition-all flex items-center gap-1.5 self-start sm:self-center shrink-0"
              >
                <Flame className="w-4 h-4" />
                <span>Personalizar e Iniciar ⚡</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Seção 2: Desafios Personalizados */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-cinzel text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-shinobi-gold" />
              <span>Desafios Personalizados ({customChallenges.length})</span>
            </h2>
            {customChallenges.length > 0 && (
              <button
                type="button"
                onClick={toggleCustomChallenges}
                className="text-slate-400 hover:text-slate-200 p-1"
                title={isCustomChallengesCollapsed ? 'Expandir Desafios Personalizados' : 'Recolher Desafios'}
              >
                {isCustomChallengesCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="text-xs text-shinobi-gold hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Desafio
          </button>
        </div>

        {!isCustomChallengesCollapsed && (
          <>
            {customChallenges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customChallenges.map((challenge) => {
                  const { daysElapsed, percent } = calculateCustomChallengeProgress(challenge);
                  const habitsCount = challenge.habits?.length || 0;
                  const completedToday = challenge.habits?.filter((h) => h.completedDates.includes(todayStr)).length || 0;

                  return (
                    <div
                      key={challenge.id}
                      onClick={() => openDetailModal(challenge.id)}
                      className="liquid-glass-card rounded-2xl p-4 relative overflow-hidden transition-all duration-300 group cursor-pointer hover:border-shinobi-gold/60 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono font-bold text-shinobi-gold">
                            {challenge.targetDays} Dias
                          </span>

                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              challenge.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                            }`}>
                              {challenge.status === 'completed' ? 'Concluído 🏆' : 'Ativo ⚡'}
                            </span>

                            {/* Botão de Excluir Direto */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomChallenge(e, challenge)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors"
                              title="Excluir este desafio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão de Editar Direto */}
                            <button
                              type="button"
                              onClick={(e) => handleEditCustomChallenge(e, challenge)}
                              className="p-1 text-slate-500 hover:text-shinobi-gold rounded-lg hover:bg-white/10 transition-colors"
                              title="Editar este desafio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-bold text-slate-100 text-sm group-hover:text-shinobi-gold transition-colors truncate">
                          {challenge.title}
                        </h3>

                        {challenge.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {challenge.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Progresso</span>
                          <span className="text-shinobi-gold font-bold">
                            Dia {daysElapsed}/{challenge.targetDays} ({percent}%)
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-shinobi-gold to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                          <span>{habitsCount} hábitos ({completedToday} hoje)</span>
                          <span className="text-shinobi-gold font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Detalhes <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2 backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-shinobi-gold/15 border border-shinobi-gold/30 text-shinobi-gold flex items-center justify-center mx-auto text-lg">
                  🎯
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-cinzel text-xs font-bold text-slate-200">
                    Nenhum Desafio Personalizado
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Crie desafios de 21, 30, 90 ou mais dias para qualquer objetivo com acompanhamento diário.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-4 py-2 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Criar Desafio</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modais */}
      <CreateChallengeModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
      />

      <ChallengeDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        challenge={selectedChallengeForModal}
      />

      {editingChallenge && (
        <EditChallengeModal
          isOpen={!!editingChallenge}
          onClose={() => setEditingChallenge(null)}
          challenge={editingChallenge}
        />
      )}
    </div>
  );
};
