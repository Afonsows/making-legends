import React, { useState } from 'react';
import { Mission } from '../../core/types';
import { useTheme } from '../../theme/ThemeContext';
import { getDefaultRyoReward } from '../../core/ryoEngine';
import { missionGrantKey } from '../../state/useHabitStore';
import { useUserStore } from '../../state/useUserStore';
import { getTodayString } from '../../core/dateUtils';
import { CheckButton, pillarColor } from '../ui/kit';
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';

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
}

export const TIME_LABEL: Record<Mission['timeOfDay'], string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  anytime: 'Livre',
};

/**
 * Linha de missão: marcar, ler e pronto.
 * Descrição, recompensas e ações (editar, excluir, reordenar) aparecem só ao tocar na linha.
 */
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
}) => {
  const { getPillar, getMissionRankInfo } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const pillar = getPillar(mission.pillarId);
  const rankInfo = getMissionRankInfo(mission.rank);
  const done = mission.isCompletedToday;

  // Depois de concluída, mostra o valor realmente creditado (com bônus)
  const grant = useUserStore((s) => (done ? s.profile.grants?.[missionGrantKey(mission.id, getTodayString())] : undefined));
  const shownXp = grant ? grant.xp : mission.xpReward;
  const shownRyo = grant ? grant.ryo : mission.ryoReward || rankInfo.ryoReward || getDefaultRyoReward(mission.rank);

  const handleDelete = () => {
    if (window.confirm(`Excluir a missão "${mission.title}"?`)) onDelete?.();
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`transition-opacity ${isDragging ? 'opacity-40' : ''}`}
    >
      <div
        className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer select-none"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <CheckButton
          checked={done}
          label={done ? `Desmarcar ${mission.title}` : `Concluir ${mission.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        />

        <div className="min-w-0 flex-1">
          <div className={`text-[15px] font-semibold leading-snug ${done ? 'text-ink3 line-through' : 'text-ink'}`}>
            {mission.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-ink2">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: pillarColor(mission.pillarId), opacity: done ? 0.5 : 1 }}
            />
            <span className="truncate">
              {pillar.categoryLabel} · {TIME_LABEL[mission.timeOfDay]}
            </span>
          </div>
        </div>

        <span className={`shrink-0 text-[13px] font-bold tabular ${done ? 'text-ok' : 'text-ink2'}`}>+{shownXp} XP</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-ink3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </div>

      {isExpanded && (
        <div className="pl-[3.75rem] pr-4 pb-4 -mt-1 space-y-3 animate-in fade-in">
          {mission.description && <p className="text-[13px] text-ink2 leading-relaxed">{mission.description}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink3">
            <span>{pillar.name}</span>
            <span>Rank {mission.rank}</span>
            <span className="tabular">+{shownRyo} Ryō</span>
            <span>{rankInfo.recommendedTime}</span>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button type="button" onClick={onEdit} className="btn btn-ghost btn-sm">
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={handleDelete} className="btn btn-ghost btn-sm">
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            )}
            {(onMoveUp || onMoveDown) && (
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={!canMoveUp}
                  className="icon-btn !w-9 !h-9 border border-line disabled:opacity-30"
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={!canMoveDown}
                  className="icon-btn !w-9 !h-9 border border-line disabled:opacity-30"
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
