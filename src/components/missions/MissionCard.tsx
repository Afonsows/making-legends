import React from 'react';
import { Mission } from '../../core/types';
import { useTheme } from '../../theme/ThemeContext';
import { 
  Check, 
  Sun, 
  Sunrise, 
  Moon, 
  Clock, 
  Trash2, 
  Edit3,
  Sparkles
} from 'lucide-react';

interface MissionCardProps {
  mission: Mission;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const { getPillar, getMissionRankInfo } = useTheme();

  const pillar = getPillar(mission.pillarId);
  const rankInfo = getMissionRankInfo(mission.rank);

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

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col justify-between p-4 pl-4.5 min-h-[148px] shadow-lg ${
        mission.isCompletedToday
          ? 'bg-emerald-950/30 backdrop-blur-md border-emerald-500/40 opacity-85 hover:opacity-100 hover:bg-emerald-950/45 hover:backdrop-blur-xl hover:border-emerald-400/60'
          : 'bg-slate-900/75 backdrop-blur-md border-slate-700/80 hover:bg-slate-800/40 hover:backdrop-blur-2xl hover:border-slate-400/70 hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)] hover:scale-[1.015]'
      }`}
    >
      {/* Camada de Brilho Liquid Glass / Efeito Translúcido e Fosco */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent pointer-events-none transition-opacity duration-300 group-hover:from-white/[0.18] group-hover:via-white/[0.04]" />

      {/* Barra lateral colorida e aura luminosa do pilar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
        style={{
          backgroundColor: pillar.color,
          boxShadow: `0 0 12px ${pillar.color}80`,
        }}
      />

      {/* Linha Superior: Checkbox, Badges e Botões de Ação */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Checkbox Shinobi */}
          <button
            onClick={onToggle}
            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
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
            <span className="truncate max-w-[110px] sm:max-w-none">{pillar.name}</span>
          </span>

          {/* Horário */}
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            {getTimeIcon(mission.timeOfDay)}
            {getTimeLabel(mission.timeOfDay)}
          </span>
        </div>

        {/* Botões de Ação (Editar e Excluir) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Editar missão"
              aria-label="Editar missão"
              className="p-1.5 text-slate-300 hover:text-shinobi-gold rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm"
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
              aria-label="Excluir missão"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
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
            +{mission.xpReward} XP
          </span>
          <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-500/40">
            <span>🪙</span>
            +{mission.ryoReward || (mission.rank === 'S' ? 300 : mission.rank === 'A' ? 160 : mission.rank === 'B' ? 90 : mission.rank === 'C' ? 50 : mission.rank === 'D' ? 25 : 10)} Ryō
          </span>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          {rankInfo.recommendedTime}
        </span>
      </div>
    </div>
  );
};
