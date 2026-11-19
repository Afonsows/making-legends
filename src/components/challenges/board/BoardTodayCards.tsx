import React from 'react';
import { useChallengeStore } from '../../../state/useChallengeStore';
import { useUIStore } from '../../../state/useUIStore';
import { getTodayString } from '../../../core/dateUtils';
import { boardEndDate, boardStats, isBoard } from '../../../core/board';
import { Bar } from '../../ui/kit';
import { ChevronRight } from 'lucide-react';

/** Atalho na tela de missões: o progresso de hoje de cada quadro de operação em andamento. */
export const BoardTodayCards: React.FC = () => {
  const challenges = useChallengeStore((s) => s.challenges);
  const openDetailModal = useChallengeStore((s) => s.openDetailModal);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const today = getTodayString();

  const boards = challenges.filter(
    (c) => isBoard(c) && c.status === 'active' && today >= c.startDate && today <= boardEndDate(c)
  );
  if (boards.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {boards.map((c) => {
        const stats = boardStats(c, today);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setActiveTab('challenges');
              openDetailModal(c.id);
            }}
            className="card w-full p-4 text-left block"
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="t-label truncate">
                  Operação · Dia {stats.dayNumber}/{c.targetDays}
                  {stats.nextMilestone && stats.nextMilestone.inDays <= 10 && (
                    <span className="text-accent">
                      {' '}
                      · {stats.nextMilestone.label} {stats.nextMilestone.inDays === 0 ? 'hoje' : `em ${stats.nextMilestone.inDays}d`}
                    </span>
                  )}
                </div>
                <div className="text-[15px] font-semibold text-ink mt-2 truncate">{c.title}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`t-num text-[22px] ${stats.today.completed ? 'text-ok' : 'text-ink'}`}>
                  {stats.today.done}
                  <span className="text-xs font-semibold text-ink3 ml-1 font-wide">/{stats.today.total}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-ink3 shrink-0" />
            </div>
            <Bar value={stats.today.pct} color={stats.today.completed ? 'rgb(var(--ok))' : undefined} className="mt-3" />
          </button>
        );
      })}
    </div>
  );
};
