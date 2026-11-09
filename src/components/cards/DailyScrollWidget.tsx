import React, { useState } from 'react';
import { teachingCards } from '../../core/cardsData';
import { useUserStore } from '../../state/useUserStore';
import { useUIStore } from '../../state/useUIStore';
import { useTheme } from '../../theme/ThemeContext';
import { TeachingCardModal } from './TeachingCardModal';
import {
  BookOpen,
  Sparkles,
  ChevronRight,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface DailyScrollWidgetProps {
  onNavigateToScrolls?: () => void;
}

export const DailyScrollWidget: React.FC<DailyScrollWidgetProps> = ({ onNavigateToScrolls }) => {
  const { profile } = useUserStore();
  const { getPillar } = useTheme();
  const { isDailyScrollCollapsed, toggleDailyScroll } = useUIStore();
  const [selectedCard, setSelectedCard] = useState<typeof teachingCards[0] | null>(null);

  const completedDays = Object.values(profile.dayLog || {}).filter((d) => d.completed).length;
  const reached = Math.max(1, completedDays);
  const sorted = [...teachingCards].sort((a, b) => a.unlockedDay - b.unlockedDay);
  const dailyCard = sorted.filter((c) => c.unlockedDay <= reached).pop() || sorted[0];
  const nextCard = sorted.find((c) => c.unlockedDay > reached);
  const daysToNext = nextCard ? nextCard.unlockedDay - completedDays : 0;
  const pillar = getPillar(dailyCard.pillarId);

  const rarityStyles = {
    common: 'border-slate-700 bg-slate-900/90 shadow-md',
    rare: 'border-cyan-500/60 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 shadow-glow-chakra/20',
    legendary: 'border-2 border-shinobi-gold bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 shadow-glow-gold/30',
  }[dailyCard.rarity];

  if (isDailyScrollCollapsed) {
    return (
      <>
        <div
          className={`rounded-2xl border p-2.5 sm:p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-all hover:border-shinobi-gold ${rarityStyles}`}
          onClick={() => {
            soundFx.playButtonClick();
            setSelectedCard(dailyCard);
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-shinobi-gold/20 border border-shinobi-gold/40 flex items-center justify-center text-shinobi-gold shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-cinzel font-bold text-slate-100 truncate block">
                Pergaminho: {dailyCard.title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {dailyCard.actionTip}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border hidden sm:inline"
              style={{
                color: pillar.color,
                borderColor: `${pillar.color}40`,
                backgroundColor: `${pillar.color}15`,
              }}
            >
              {pillar.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleDailyScroll();
              }}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-white/10"
              title="Expandir pergaminho"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {selectedCard && (
          <TeachingCardModal
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        onClick={() => {
          soundFx.playButtonClick();
          setSelectedCard(dailyCard);
        }}
        className={`rounded-2xl border p-4 sm:p-4.5 cursor-pointer relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-shinobi-gold group ${rarityStyles}`}
      >
        {/* Kanji de Fundo */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-7xl font-kanji select-none pointer-events-none opacity-[0.07] text-white">
          {dailyCard.kanji || '忍'}
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Top Bar do Card */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold font-bold border border-shinobi-gold/40 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Pergaminho #{sorted.indexOf(dailyCard) + 1} de {sorted.length}
                </span>

                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1"
                  style={{
                    color: pillar.color,
                    borderColor: `${pillar.color}40`,
                    backgroundColor: `${pillar.color}15`,
                  }}
                >
                  {pillar.badgeIcon} {pillar.name}
                </span>

                <span className="text-[10px] font-mono text-slate-400 capitalize">
                  • {dailyCard.rarity}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDailyScroll();
                }}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-white/10"
                title="Recolher pergaminho (Modo Clean)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            {/* Título Principal */}
            <h4 className="font-cinzel text-sm sm:text-base font-bold text-slate-100 group-hover:text-shinobi-gold transition-colors flex items-center gap-2">
              <span>{dailyCard.title}</span>
              {dailyCard.kanji && (
                <span className="text-xs text-shinobi-gold/60 font-serif">[{dailyCard.kanji}]</span>
              )}
            </h4>

            {/* Teaser de Sabedoria */}
            <p className="text-xs text-slate-300 italic line-clamp-2">
              "{dailyCard.wisdom}"
            </p>

            {/* Ação Prática Rápida */}
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono font-semibold pt-0.5">
              <Zap className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">Ação do dia: {dailyCard.actionTip}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0 shrink-0">
            {nextCard && daysToNext > 0 && (
              <span className="text-[10px] font-mono text-slate-400">
                Próximo em: <strong className="text-shinobi-gold">{daysToNext} {daysToNext === 1 ? 'dia' : 'dias'}</strong>
              </span>
            )}

            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-shinobi-gold/20 hover:bg-shinobi-gold/30 text-shinobi-gold text-xs font-bold border border-shinobi-gold/50 flex items-center gap-1 transition-all group-hover:shadow-glow-gold/40"
            >
              <span>Abrir Pergaminho</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {selectedCard && (
        <TeachingCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  );
};
