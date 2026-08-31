import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { RadarChart } from './RadarChart';
import { getLevelProgress, getRequiredXpForLevel } from '../../core/xpEngine';
import { 
  Shield, 
  Flame, 
  Sparkles, 
  Award, 
  Zap, 
  AlertTriangle, 
  Edit, 
  Check,
  Lock,
  ChevronRight
} from 'lucide-react';
import { allGameItems } from '../../core/itemsData';

interface StatusWindowProps {
  onOpenAvatarCustomizer?: () => void;
}

export const StatusWindow: React.FC<StatusWindowProps> = ({ onOpenAvatarCustomizer }) => {
  const { 
    profile, 
    toggleHardMode, 
    equipItem, 
    unequipItem, 
    getEquippedItems 
  } = useUserStore();
  const { getRankByLevel, theme } = useTheme();

  const rankInfo = getRankByLevel(profile.level);
  const { currentLevel, currentLevelXp, nextLevelXpThreshold, progressPercent } = getLevelProgress(profile.totalXp);
  const equippedList = getEquippedItems();

  const maxPillarStat = Math.max(
    100,
    ...Object.values(profile.pillarXp)
  );

  return (
    <div className="pb-24 pt-3 max-w-4xl mx-auto px-4 space-y-4">
      {/* Cabeçalho do Pergaminho de Status */}
      <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
          {/* Avatar com Aura de Chakra */}
          <div className="relative flex-shrink-0">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-shinobi-card to-slate-900 border-2 border-shinobi-gold flex items-center justify-center text-4xl shadow-glow-gold/40 relative`}>
              <span>{rankInfo.badge}</span>
              <div className="absolute -bottom-2 -right-2 bg-shinobi-crimson text-white text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-shinobi-bg">
                Nv. {currentLevel}
              </div>
            </div>
            {onOpenAvatarCustomizer && (
              <button
                onClick={onOpenAvatarCustomizer}
                className="absolute -top-1 -right-1 p-1 bg-shinobi-card border border-shinobi-border text-slate-300 hover:text-shinobi-gold rounded-full transition-colors"
                title="Personalizar Avatar"
              >
                <Edit className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Nome e Títulos */}
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40">
                {rankInfo.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {profile.totalXp} XP Total
              </span>
            </div>

            <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-100">
              {profile.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {rankInfo.description}
            </p>

            {/* Barra de XP de Nível */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Progresso para o Nível {currentLevel + 1}</span>
                <span className="font-bold text-shinobi-gold">{progressPercent}% ({currentLevelXp}/{nextLevelXpThreshold} XP)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-shinobi-chakra via-shinobi-jade to-shinobi-gold transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Central: Radar de Atributos & Detalhamento dos 5 Pilares */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Painel do Radar de Chakra */}
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 flex flex-col items-center justify-center shadow-lg">
          <h3 className="font-cinzel text-sm font-bold text-slate-200 mb-2 flex items-center gap-1.5 self-start">
            <Sparkles className="w-4 h-4 text-shinobi-chakra" />
            Pentagrama de Atributos Shinobi
          </h3>
          <RadarChart stats={profile.pillarXp} maxStat={maxPillarStat} />
        </div>

        {/* Detalhamento dos 5 Pilares */}
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 space-y-3 shadow-lg">
          <h3 className="font-cinzel text-sm font-bold text-slate-200 mb-2">
            Mestria nos 5 Pilares
          </h3>

          {(Object.keys(theme.pillars) as (keyof typeof theme.pillars)[]).map((pId) => {
            const pillar = theme.pillars[pId];
            const xp = profile.pillarXp[pId] || 0;
            const percentage = maxPillarStat > 0 ? Math.min(100, Math.round((xp / maxPillarStat) * 100)) : 0;

            return (
              <div key={pId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5" style={{ color: pillar.color }}>
                    <span>{pillar.badgeIcon}</span>
                    {pillar.name} ({pillar.categoryLabel})
                  </span>
                  <span className="font-mono text-slate-300 font-bold">{xp} XP</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(8, percentage)}%`,
                      backgroundColor: pillar.color,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relíquias e Equipamentos Funcionais (Efeito Real de XP e Dano) */}
      <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-cinzel text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-shinobi-gold" />
              Equipamentos & Relíquias Ativas ({equippedList.length}/3)
            </h3>
            <p className="text-xs text-slate-400">
              Itens equipados concedem multiplicadores reais de XP e escudos extras.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {equippedList.map((item) => (
            <div
              key={item.id}
              className="bg-shinobi-bg/80 border border-shinobi-border hover:border-shinobi-gold/60 p-3 rounded-xl flex items-start gap-3 transition-colors group"
            >
              <div className="text-2xl p-2 rounded-lg bg-shinobi-card border border-shinobi-border/60">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-shinobi-gold truncate">
                  {item.name}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                  {item.description}
                </p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-shinobi-jade bg-shinobi-jade/10 px-1.5 py-0.5 rounded border border-shinobi-jade/30">
                    +{item.buffValue}% {item.buffType.replace('_', ' ').toUpperCase()}
                  </span>
                  <button
                    onClick={() => unequipItem(item.id)}
                    className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    Desequipar
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Slots Vazios */}
          {Array.from({ length: 3 - equippedList.length }).map((_, idx) => (
            <div
              key={`empty_${idx}`}
              className="border-2 border-dashed border-slate-700/60 rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-600 min-h-[90px]"
            >
              <Lock className="w-4 h-4 mb-1" />
              <span className="text-[11px]">Slot de Relíquia Vazio</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modo Elite (Treino Extremo / Hard Mode) */}
      <div className={`rounded-2xl border p-4 transition-all ${
        profile.isHardModeEnabled
          ? 'bg-rose-950/20 border-rose-600/60 shadow-glow-crimson/20'
          : 'bg-shinobi-card border-shinobi-border'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border ${
              profile.isHardModeEnabled
                ? 'bg-rose-600/20 border-rose-600 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-100">
                  {theme.vocabulary.hardMode}
                </h4>
                {profile.isHardModeEnabled && (
                  <span className="text-[10px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full">
                    ATIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Para quem busca disciplina implacável: desativa a tolerância semanal do Escudo de Chakra. Um único dia sem missões quebra a sequência e exige missão de compensação.
              </p>
            </div>
          </div>

          <button
            onClick={toggleHardMode}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex-shrink-0 ${
              profile.isHardModeEnabled
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {profile.isHardModeEnabled ? 'Desativar Elite' : 'Ativar Modo Elite'}
          </button>
        </div>
      </div>
    </div>
  );
};
