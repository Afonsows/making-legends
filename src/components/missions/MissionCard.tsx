import React, { useEffect, useRef, useState } from 'react';
import { Mission } from '../../core/types';
import { useTheme } from '../../theme/ThemeContext';
import { getDefaultRyoReward } from '../../core/ryoEngine';
import { useHabitStore, missionGrantKey } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { getTodayString } from '../../core/dateUtils';
import { 
  Check, 
  Sun, 
  Sunrise, 
  Moon, 
  Clock, 
  Trash2, 
  Edit3,
  Sparkles,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface MissionCardProps {
  mission: Mission;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isCleanMode?: boolean;
  isForceExpanded?: boolean;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging = false,
  isCleanMode = false,
  isForceExpanded = false,
}) => {
  const { getPillar, getMissionRankInfo } = useTheme();

  const pillar = getPillar(mission.pillarId);
  const rankInfo = getMissionRankInfo(mission.rank);

  const [isExpanded, setIsExpanded] = useState(isForceExpanded);

  useEffect(() => {
    setIsExpanded(isForceExpanded);
  }, [isForceExpanded]);

  const lastCompletion = useHabitStore((s) => s.lastCompletion);
  const grant = useUserStore((s) => (mission.isCompletedToday ? s.profile.grants?.[missionGrantKey(mission.id, getTodayString())] : undefined));
  const shownXp = grant ? grant.xp : mission.xpReward;
  const shownRyo = grant ? grant.ryo : mission.ryoReward || rankInfo.ryoReward || getDefaultRyoReward(mission.rank);
  const [poofKey, setPoofKey] = useState(() =>
    lastCompletion?.id === mission.id && Date.now() - lastCompletion.at < 1500 ? 1 : 0
  );
  const wasCompleted = useRef(mission.isCompletedToday);
  useEffect(() => {
    if (mission.isCompletedToday && !wasCompleted.current) setPoofKey((k) => k + 1);
    wasCompleted.current = mission.isCompletedToday;
  }, [mission.isCompletedToday]);

  const getTimeIcon = (time: Mission['timeOfDay']) => {
    switch (time) {
      case 'morning':
        return <Sunrise className="w-3 h-3 text-amber-400" />;
      case 'afternoon':
        return <Sun className="w-3 h-3 text-yellow-400" />;
      case 'evening':
        return <Moon className="w-3 h-3 text-indigo-400" />;
      default:
        return <Clock className="w-3 h-3 text-slate-400" />;
    }
  };

  const getTimeLabel = (time: Mission['timeOfDay']) => {
    switch (time) {
      case 'morning':
        return 'Manhã';
      case 'afternoon':
        return 'Tarde';
      case 'evening':
        return 'Noite';
      default:
        return 'Livre';
    }
  };

  const showDetailed = isCleanMode ? isExpanded : !isExpanded ? true : true;
  // If isCleanMode is active, default is compact unless toggled.
  const isCompact = isCleanMode && !isExpanded;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 select-none touch-manipulation active:scale-[0.99] ${
        isCompact ? 'p-3 pl-4 min-h-[58px] flex flex-col justify-center' : 'p-4 pl-4.5 min-h-[148px] flex flex-col justify-between'
      } ${
        isDragging ? 'opacity-40 scale-95 border-2 border-dashed border-shinobi-gold shadow-2xl' : ''
      } ${
        mission.isCompletedToday
          ? 'liquid-glass-completed opacity-85 hover:opacity-100'
          : 'liquid-glass-card'
      }`}
    >
      {/* Kanji do pilar em marca d'água */}
      {!isCompact && (
        <div
          className="absolute -right-2 -bottom-4 font-kanji text-[84px] leading-none select-none pointer-events-none"
          style={{ color: pillar.color, opacity: mission.isCompletedToday ? 0.05 : 0.07 }}
        >
          {pillar.kanji}
        </div>
      )}

      {/* Carimbo de missão cumprida */}
      {mission.isCompletedToday && (
        <div
          key={`stamp_${poofKey}`}
          className={`absolute z-20 hanko-stamp animate-stamp px-1.5 py-1 pointer-events-none ${
            isCompact ? 'right-2.5 top-1/2 -translate-y-1/2 text-xl' : 'right-3 bottom-10 text-2xl'
          }`}
          aria-hidden="true"
        >
          完
        </div>
      )}

      {/* Puf de fumaça */}
      {poofKey > 0 && mission.isCompletedToday && (
        <div key={`poof_${poofKey}`} className="smoke-poof w-24 h-24 left-1/2 top-1/2 -ml-12 -mt-12 z-30" aria-hidden="true" />
      )}

      {/* Camada de Brilho Liquid Glass */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent pointer-events-none transition-opacity duration-300 group-hover:from-white/[0.18] group-hover:via-white/[0.04]" />

      {/* Barra lateral colorida do pilar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
        style={{
          backgroundColor: pillar.color,
          boxShadow: `0 0 12px ${pillar.color}80`,
        }}
      />

      {isCompact ? (
        /* ── MODO COMPACTO / CLEAN ── */
        <div className="flex items-center justify-between gap-2.5 relative z-10">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!mission.isCompletedToday && draggable && (
              <span
                className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5 shrink-0 hidden sm:block"
                title="Arraste para reordenar"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </span>
            )}

            {/* Checkbox Shinobi */}
            <button
              onClick={onToggle}
              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 ${
                mission.isCompletedToday
                  ? 'bg-shinobi-jade border-shinobi-jade text-slate-950 shadow-glow-jade/40 scale-105'
                  : 'border-slate-600 hover:border-shinobi-gold/80 bg-slate-950/70'
              }`}
              aria-label={mission.isCompletedToday ? 'Desmarcar missão' : 'Concluir missão'}
            >
              {mission.isCompletedToday && <Check className="w-4 h-4 stroke-[3]" />}
            </button>

            {/* Rank */}
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0"
              style={{
                color: rankInfo.color,
                borderColor: `${rankInfo.color}40`,
                backgroundColor: `${rankInfo.color}15`,
              }}
            >
              {mission.rank}
            </span>

            {/* Título */}
            <span
              onClick={onToggle}
              className={`text-xs font-semibold truncate cursor-pointer transition-colors ${
                mission.isCompletedToday ? 'line-through text-slate-400' : 'text-slate-100 group-hover:text-shinobi-gold'
              }`}
            >
              {mission.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* XP Badge Compacta */}
            <span className="text-[10px] font-mono font-bold text-shinobi-gold bg-shinobi-gold/15 px-1.5 py-0.5 rounded border border-shinobi-gold/30">
              +{shownXp} XP
            </span>

            {/* Botão de Expandir Detalhes */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/10 transition-colors"
              title="Expandir detalhes da missão"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* ── MODO DETALHADO ── */
        <>
          {/* Linha Superior: Checkbox, Badges e Botões de Ação */}
          <div className="flex items-start justify-between gap-2 relative z-10">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {!mission.isCompletedToday && draggable && (
                <span
                  className="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5"
                  title="Arraste para reordenar"
                >
                  <GripVertical className="w-4 h-4" />
                </span>
              )}

              {/* Checkbox Shinobi */}
              <button
                onClick={onToggle}
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 ${
                  mission.isCompletedToday
                    ? 'bg-shinobi-jade border-shinobi-jade text-slate-950 shadow-glow-jade/40 scale-105'
                    : 'border-slate-600 hover:border-shinobi-gold/80 bg-slate-950/70'
                }`}
                aria-label={mission.isCompletedToday ? 'Desmarcar missão' : 'Concluir missão'}
              >
                {mission.isCompletedToday && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              {/* Rank da Missão */}
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border"
                style={{
                  color: rankInfo.color,
                  borderColor: `${rankInfo.color}40`,
                  backgroundColor: `${rankInfo.color}15`,
                }}
              >
                Rank {mission.rank}
              </span>

              {/* Pilar Temático */}
              <span
                className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/70 border border-slate-800"
                style={{ color: pillar.color }}
              >
                <span>{pillar.badgeIcon}</span>
                <span className="truncate max-w-[100px] sm:max-w-none">{pillar.name}</span>
              </span>

              {/* Horário */}
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                {getTimeIcon(mission.timeOfDay)}
                {getTimeLabel(mission.timeOfDay)}
              </span>
            </div>

            {/* Botões de Ação (Mover, Editar, Excluir e Recolher) */}
            <div className="flex items-center gap-1 shrink-0">
              {!mission.isCompletedToday && onMoveUp && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp();
                  }}
                  disabled={!canMoveUp}
                  title="Mover para cima"
                  className="p-1 text-slate-400 hover:text-shinobi-gold disabled:opacity-30 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}

              {!mission.isCompletedToday && onMoveDown && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown();
                  }}
                  disabled={!canMoveDown}
                  title="Mover para baixo"
                  className="p-1 text-slate-400 hover:text-shinobi-gold disabled:opacity-30 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}

              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Editar missão"
                  className="p-1.5 text-slate-300 hover:text-shinobi-gold rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm ml-0.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title="Excluir missão"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Botão de Recolher para Compacto */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                title="Recolher card"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Conteúdo Central: Título e Descrição */}
          <div className="my-2.5 relative z-10 cursor-pointer" onClick={onToggle}>
            <h4
              className={`text-sm font-bold leading-snug transition-all ${
                mission.isCompletedToday
                  ? 'line-through text-slate-400'
                  : 'text-slate-100 group-hover:text-shinobi-gold'
              }`}
            >
              {mission.title}
            </h4>

            {mission.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {mission.description}
              </p>
            )}
          </div>

          {/* Rodapé do Card: Recompensas e Tempo */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 relative z-10 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-shinobi-gold flex items-center gap-1 bg-shinobi-gold/15 px-2 py-0.5 rounded-lg border border-shinobi-gold/30">
                <Sparkles className="w-3 h-3" />
                +{shownXp} XP
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-500/40">
                <span>🪙</span>
                +{shownRyo} Ryō
              </span>
            </div>

            <span className="text-[10px] text-slate-400 font-mono">
              {rankInfo.recommendedTime}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
