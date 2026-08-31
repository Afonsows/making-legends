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
      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
        mission.isCompletedToday
          ? 'bg-shinobi-card/40 border-shinobi-border/40 opacity-75'
          : 'bg-shinobi-card border-shinobi-border hover:border-shinobi-border/80 hover:shadow-lg'
      }`}
    >
      {/* Barra lateral colorida do pilar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 transition-all"
        style={{ backgroundColor: pillar.color }}
      />

      <div className="p-3.5 pl-4.5 flex items-start gap-3">
        {/* Checkbox de Conclusão Shinobi */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
            mission.isCompletedToday
              ? 'bg-shinobi-jade border-shinobi-jade text-shinobi-bg shadow-glow-jade/40 scale-105'
              : 'border-slate-600 hover:border-shinobi-gold/80 bg-shinobi-bg/60'
          }`}
          aria-label={mission.isCompletedToday ? 'Desmarcar missão' : 'Concluir missão'}
        >
          {mission.isCompletedToday && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Informações da Missão */}
        <div className="flex-1 min-w-0" onClick={onToggle}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {/* Rank da Missão (E, D, C, B, A, S) */}
            <span
              className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border"
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
              className="text-[10px] font-semibold flex items-center gap-1"
              style={{ color: pillar.color }}
            >
              <span>{pillar.badgeIcon}</span>
              {pillar.name}
            </span>

            {/* Horário Recomendado */}
            <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto">
              {getTimeIcon(mission.timeOfDay)}
              {getTimeLabel(mission.timeOfDay)}
            </span>
          </div>

          <h4
            className={`text-sm font-semibold transition-all ${
              mission.isCompletedToday
                ? 'line-through text-slate-400'
                : 'text-slate-100 group-hover:text-shinobi-gold'
            }`}
          >
            {mission.title}
          </h4>

          {mission.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
              {mission.description}
            </p>
          )}

          {/* Recompensa de XP e Ryō */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold text-shinobi-gold flex items-center gap-1 bg-shinobi-gold/10 px-2 py-0.5 rounded border border-shinobi-gold/20">
              <Sparkles className="w-3 h-3" />
              +{mission.xpReward} XP
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
              <span>🪙</span>
              +{mission.ryoReward || (mission.rank === 'S' ? 300 : mission.rank === 'A' ? 160 : mission.rank === 'B' ? 90 : mission.rank === 'C' ? 50 : mission.rank === 'D' ? 25 : 10)} Ryō
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {rankInfo.recommendedTime}
            </span>
          </div>
        </div>

        {/* Ações de Edição e Exclusão */}
        <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Editar missão"
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
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
              aria-label="Excluir missão"
              className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
