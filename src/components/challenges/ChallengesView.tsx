import React, { useState } from 'react';
import { useChallengeStore } from '../../state/useChallengeStore';
import { CreateChallengeModal } from './CreateChallengeModal';
import { ChallengeDetailModal } from './ChallengeDetailModal';
import { getTodayString } from '../../core/streakEngine';
import { 
  Trophy, 
  Flame, 
  Target, 
  Plus, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Layers,
  ChevronRight,
  Award,
  Zap
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
    closeDetailModal 
  } = useChallengeStore();

  const todayStr = getTodayString();

  // Desafio Oficial de 66 Dias
  const official66 = challenges.find((c) => c.isOfficial66 || c.id === 'challenge_official_66');
  // Outros desafios criados pelo usuário
  const customChallenges = challenges.filter((c) => !c.isOfficial66 && c.id !== 'challenge_official_66');
  
  const activeChallenges = challenges.filter((c) => c.status === 'active');
  const completedChallenges = challenges.filter((c) => c.status === 'completed');

  const totalHabitsCount = challenges.reduce((acc, c) => acc + (c.habits?.length || 0), 0);

  const calculateChallengeProgress = (challenge: typeof challenges[0]) => {
    const start = new Date(challenge.startDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diff = Math.max(0, today.getTime() - start.getTime());
    const daysElapsed = Math.min(challenge.targetDays, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
    const percent = Math.min(100, Math.round((daysElapsed / challenge.targetDays) * 100));
    return { daysElapsed, percent };
  };

  return (
    <div className="pb-28 pt-3 max-w-4xl mx-auto px-3 sm:px-4 space-y-5">
      {/* Banner / Cabeçalho Liquid Glass da Aba Desafio */}
      <div className="liquid-glass-nav rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-2xl border border-white/20">
        {/* Luzes difusas de fundo */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-shinobi-gold/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-shinobi-crimson/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-shinobi-gold/20 border border-shinobi-gold/40 text-shinobi-gold text-xs font-mono font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>SISTEMA DE DESAFIOS & HÁBITOS</span>
            </div>

            <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
              <span>Desafios & Maestria</span>
            </h1>

            <p className="text-xs text-slate-300 max-w-md">
              Acompanhamento diário detalhado, matriz de consistência de 6 meses e protocolos de transformação com no mínimo 21 dias.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-3 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-2xl shadow-glow-gold transition-all duration-300 flex items-center justify-center gap-2 self-start sm:self-center flex-shrink-0 group"
          >
            <Plus className="w-4 h-4 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
            <span>Criar Novo Desafio</span>
          </button>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-center relative z-10">
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md">
            <span className="text-slate-400 block text-[10px] sm:text-xs">Desafios Ativos</span>
            <span className="font-mono font-bold text-shinobi-gold text-base sm:text-lg">
              {activeChallenges.length}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md">
            <span className="text-slate-400 block text-[10px] sm:text-xs">Hábitos Monitorados</span>
            <span className="font-mono font-bold text-emerald-400 text-base sm:text-lg">
              {totalHabitsCount}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-md">
            <span className="text-slate-400 block text-[10px] sm:text-xs">Concluídos</span>
            <span className="font-mono font-bold text-cyan-400 text-base sm:text-lg">
              {completedChallenges.length}
            </span>
          </div>
        </div>
      </div>

      {/* Seção 1: Desafio Oficial de 66 Dias (Em Destaque — Mais Popular) */}
      {official66 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-cinzel text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-shinobi-gold" />
              <span>Desafio Principal de Formação de Hábito</span>
            </h2>
          </div>

          {(() => {
            const { daysElapsed, percent } = calculateChallengeProgress(official66);
            const habitsCount = official66.habits?.length || 0;
            const completedToday = official66.habits?.filter((h) => h.completedDates.includes(todayStr)).length || 0;

            return (
              <div className="pergaminho-bg rounded-3xl border-2 border-shinobi-gold p-5 sm:p-6 relative overflow-hidden shadow-2xl space-y-4">
                {/* Filete de Brilho Especular */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-shinobi-gold via-white to-transparent pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-gradient-to-r from-amber-500 to-shinobi-gold text-slate-950 font-extrabold text-[10px] px-3 py-0.5 rounded-full shadow-glow-gold/40 animate-pulse">
                        ⭐ MAIS POPULAR • FORMAÇÃO DE HÁBITO
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-800">
                        Protocolo 66 Dias
                      </span>
                    </div>

                    <h3 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100">
                      {official66.title}
                    </h3>

                    <p className="text-xs text-slate-300 max-w-xl">
                      {official66.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDetailModal(official66.id)}
                    className="px-5 py-2.5 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all duration-300 flex items-center gap-1.5 self-start sm:self-center flex-shrink-0"
                  >
                    <span>Abrir Acompanhamento</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Barra de Progresso e Estatísticas Rápidas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1 relative z-10">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Progresso</span>
                    <span className="font-bold text-shinobi-gold font-mono text-sm sm:text-base">
                      Dia {daysElapsed} / 66 ({percent}%)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Hábitos Feitos Hoje</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm sm:text-base">
                      {completedToday} / {habitsCount}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Missões do Desafio</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm sm:text-base">
                      {habitsCount} hábitos
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Dias Restantes</span>
                    <span className="font-bold text-rose-400 font-mono text-sm sm:text-base">
                      {Math.max(0, 66 - daysElapsed)} dias
                    </span>
                  </div>
                </div>

                {/* Barra Visual */}
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative z-10">
                  <div
                    className="h-full bg-gradient-to-r from-shinobi-gold via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Prévia dos Hábitos */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 relative z-10">
                  <span className="text-[10px] text-slate-400 font-mono">Hábitos incluídos:</span>
                  {official66.habits.map((h) => (
                    <span
                      key={h.id}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-950/90 text-slate-300 border border-slate-800 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color || '#10b981' }} />
                      <span>{h.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Seção 2: Outros Desafios Criados pelo Usuário */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-cinzel text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
            <Target className="w-4 h-4 text-shinobi-gold" />
            <span>Seus Desafios Personalizados ({customChallenges.length})</span>
          </h2>

          <button
            type="button"
            onClick={openCreateModal}
            className="text-xs text-shinobi-gold hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Desafio
          </button>
        </div>

        {customChallenges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {customChallenges.map((challenge) => {
              const { daysElapsed, percent } = calculateChallengeProgress(challenge);
              const habitsCount = challenge.habits?.length || 0;
              const completedToday = challenge.habits?.filter((h) => h.completedDates.includes(todayStr)).length || 0;

              return (
                <div
                  key={challenge.id}
                  onClick={() => openDetailModal(challenge.id)}
                  className="liquid-glass-card rounded-3xl p-5 relative overflow-hidden transition-all duration-300 group cursor-pointer hover:border-shinobi-gold/60 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono font-bold text-shinobi-gold">
                        {challenge.targetDays} Dias
                      </span>

                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        challenge.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      }`}>
                        {challenge.status === 'completed' ? 'Concluído 🏆' : 'Ativo ⚡'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-100 text-base group-hover:text-shinobi-gold transition-colors truncate">
                      {challenge.title}
                    </h3>

                    {challenge.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {challenge.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Progresso</span>
                      <span className="text-shinobi-gold font-bold">
                        Dia {daysElapsed}/{challenge.targetDays} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-shinobi-gold to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{habitsCount} hábitos ({completedToday} feitos hoje)</span>
                      <span className="text-shinobi-gold font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Ver Detalhes <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-slate-800 space-y-3 backdrop-blur-md">
            <div className="w-12 h-12 rounded-2xl bg-shinobi-gold/15 border border-shinobi-gold/30 text-shinobi-gold flex items-center justify-center mx-auto text-xl">
              🎯
            </div>
            <div className="space-y-1">
              <h4 className="font-cinzel text-sm font-bold text-slate-200">
                Inicie Seu Próprio Desafio Personalizado
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Crie jornadas de 21 dias, 40 dias, 90 dias, 365 dias ou o período que desejar para forjar novos hábitos com acompanhamento centralizado.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-5 py-2.5 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Criar Desafio (Mínimo 21 Dias)</span>
            </button>
          </div>
        )}
      </div>

      {/* Modais da Aba Desafio */}
      <CreateChallengeModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
      />

      <ChallengeDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        challenge={selectedChallengeForModal}
      />
    </div>
  );
};
