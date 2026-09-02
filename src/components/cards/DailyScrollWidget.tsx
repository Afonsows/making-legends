import React, { useState } from 'react';
import { teachingCards } from '../../core/cardsData';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { TeachingCardModal } from './TeachingCardModal';
import { 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  Zap, 
  Share2,
  Award
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface DailyScrollWidgetProps {
  onNavigateToScrolls?: () => void;
}

export const DailyScrollWidget: React.FC<DailyScrollWidgetProps> = ({ onNavigateToScrolls }) => {
  const { profile } = useUserStore();
  const { getPillar } = useTheme();
  const [selectedCard, setSelectedCard] = useState<typeof teachingCards[0] | null>(null);

  // Determina o pergaminho mais relevante:
  // 1. O cartão com unlockedDay mais próximo ou igual ao dia atual do protocolo
  // 2. Ou o último cartão presente em profile.unlockedCards
  // 3. Ou o primeiro cartão (Dia 1)
  const currentDay = profile.activeChallenge?.currentDay || profile.currentProtocolDay || 1;
  
  const dailyCard = 
    teachingCards.find((c) => c.unlockedDay === currentDay) ||
    teachingCards.filter((c) => profile.unlockedCards.includes(c.id)).pop() ||
    teachingCards[0];

  const isUnlocked = profile.unlockedCards.includes(dailyCard.id);
  const pillar = getPillar(dailyCard.pillarId);

  const rarityStyles = {
    common: 'border-slate-700 bg-slate-900/90 shadow-md',
    rare: 'border-cyan-500/60 bg-gradient-to-r from-slate-900 via-cyan-950/30 to-slate-900 shadow-glow-chakra/20',
    legendary: 'border-2 border-shinobi-gold bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 shadow-glow-gold/30',
  }[dailyCard.rarity];

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
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-7xl font-serif font-black select-none pointer-events-none opacity-5 text-white">
          {dailyCard.kanji || '忍'}
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Top Bar do Card */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold font-bold border border-shinobi-gold/40 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                Pergaminho de Sabedoria do Dia #{dailyCard.unlockedDay}
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

          {/* Botão de Ação */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundFx.playButtonClick();
                setSelectedCard(dailyCard);
              }}
              className="px-3 py-1.5 bg-shinobi-gold text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold hover:bg-shinobi-goldHover transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Abrir Pergaminho</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Instagram / Sabedoria */}
      {selectedCard && (
        <TeachingCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  );
};
