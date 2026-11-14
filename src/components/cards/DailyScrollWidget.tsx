import React, { useState } from 'react';
import { teachingCards } from '../../core/cardsData';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { TeachingCardModal } from './TeachingCardModal';
import { SectionHeader, pillarColor } from '../ui/kit';
import { ChevronRight } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface DailyScrollWidgetProps {
  onNavigateToScrolls?: () => void;
}

/** Ensinamento do dia: um cartão discreto no fim da tela "Hoje". */
export const DailyScrollWidget: React.FC<DailyScrollWidgetProps> = ({ onNavigateToScrolls }) => {
  const { profile } = useUserStore();
  const { getPillar } = useTheme();
  const [selectedCard, setSelectedCard] = useState<typeof teachingCards[0] | null>(null);

  const completedDays = Object.values(profile.dayLog || {}).filter((d) => d.completed).length;
  const reached = Math.max(1, completedDays);
  const sorted = [...teachingCards].sort((a, b) => a.unlockedDay - b.unlockedDay);
  const dailyCard = sorted.filter((c) => c.unlockedDay <= reached).pop() || sorted[0];
  const nextCard = sorted.find((c) => c.unlockedDay > reached);
  const daysToNext = nextCard ? nextCard.unlockedDay - completedDays : 0;
  const pillar = getPillar(dailyCard.pillarId);

  return (
    <section>
      <SectionHeader
        title="Ensinamento"
        meta={nextCard && daysToNext > 0 ? `próximo em ${daysToNext} ${daysToNext === 1 ? 'dia' : 'dias'}` : undefined}
      >
        {onNavigateToScrolls && (
          <button type="button" onClick={onNavigateToScrolls} className="text-[13px] font-semibold text-ink2 hover:text-ink px-1">
            Ver todos
          </button>
        )}
      </SectionHeader>

      <button
        type="button"
        onClick={() => {
          soundFx.playButtonClick();
          setSelectedCard(dailyCard);
        }}
        className="card mt-2 w-full p-4 flex items-center gap-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-ink2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: pillarColor(dailyCard.pillarId) }} />
            <span>
              {pillar.categoryLabel} · {sorted.indexOf(dailyCard) + 1} de {sorted.length}
            </span>
          </div>
          <div className="text-[15px] font-semibold text-ink mt-1.5 leading-snug">{dailyCard.title}</div>
          <p className="text-[13px] text-ink2 mt-1 leading-snug line-clamp-2">{dailyCard.actionTip}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-ink3 shrink-0" />
      </button>

      {selectedCard && <TeachingCardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </section>
  );
};
