import React from 'react';
import { TeachingCard } from '../../core/types';
import { useTheme } from '../../theme/ThemeContext';
import { 
  X, 
  Sparkles, 
  Zap, 
  Check
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface TeachingCardModalProps {
  card: TeachingCard | null;
  onClose: () => void;
}

export const TeachingCardModal: React.FC<TeachingCardModalProps> = ({ card, onClose }) => {
  const { getPillar } = useTheme();

  if (!card) return null;

  const pillar = getPillar(card.pillarId);

  // Configurações cromáticas e temáticas por raridade
  const rarityConfig = {
    common: {
      tierName: '✦ FUNDAMENTOS SHINOBI ✦',
      emblemImg: '/images/cards/emblem_common.png',
      modalBorder: 'border border-slate-700/80 shadow-2xl',
      modalBg: 'bg-[#161618]/95',
      ribbonBg: 'bg-slate-800 text-slate-300 border-slate-600',
      accentColor: '#94a3b8',
      emblemBg: 'bg-slate-900/80 border border-slate-700 shadow-md',
      kanjiWatermark: 'text-slate-500/10',
      sealBg: '#ef4444',
      sealText: '印',
      btnGradient: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600',
      cornerGlyph: null,
    },
    rare: {
      tierName: '⚡ FLUXO DE CHAKRA ARCANO ⚡',
      emblemImg: '/images/cards/emblem_rare.png',
      modalBorder: 'border-2 border-cyan-400/90 shadow-[0_0_40px_rgba(6,182,212,0.35)]',
      modalBg: 'bg-gradient-to-b from-[#082032]/98 via-[#05131f]/98 to-[#020617]/98',
      ribbonBg: 'bg-cyan-950 text-cyan-300 border-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]',
      accentColor: '#06b6d4',
      emblemBg: 'bg-cyan-950/70 border-2 border-cyan-400 shadow-glow-chakra',
      kanjiWatermark: 'text-cyan-400/15',
      sealBg: '#0891b2',
      sealText: '気',
      btnGradient: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.5)]',
      cornerGlyph: '⚡',
    },
    legendary: {
      tierName: '👑 MESTRIA ANCESTRAL DOS SANNIN 👑',
      emblemImg: '/images/cards/emblem_legendary.png',
      modalBorder: 'border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.55)]',
      modalBg: 'bg-gradient-to-b from-[#2b1602]/98 via-[#180d02]/98 to-[#0a0501]/98',
      ribbonBg: 'bg-gradient-to-r from-amber-500 via-shinobi-gold to-amber-400 text-slate-950 font-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)]',
      accentColor: '#f59e0b',
      emblemBg: 'bg-amber-950/70 border-2 border-amber-400 shadow-glow-gold',
      kanjiWatermark: 'text-amber-400/20',
      sealBg: '#d97706',
      sealText: '龍',
      btnGradient: 'bg-gradient-to-r from-shinobi-gold via-amber-400 to-amber-500 hover:opacity-95 text-slate-950 font-black shadow-glow-gold',
      cornerGlyph: '❖',
    },
  }[card.rarity];

  return (
    /* Backdrop translúcido estilo Notion (permite ver a tela/aba anterior com leve desfoque) */
    <div 
      onClick={() => {
        soundFx.playButtonClick();
        onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-[3px] animate-in fade-in duration-200"
    >
      {/* Container Centralizado do Pergaminho - Cabe 100% na tela sem rolagem */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md sm:max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-5 relative shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden ${rarityConfig.modalBorder} ${rarityConfig.modalBg}`}
      >
        {/* Efeitos Sutis de Fundo */}
        {card.rarity === 'legendary' && (
          <>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-shinobi-gold to-rose-500 shadow-glow-gold" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          </>
        )}
        {card.rarity === 'rare' && (
          <>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 shadow-glow-chakra" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Kanji Gigante de Fundo (Watermark) */}
        <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-8xl sm:text-9xl font-serif font-black select-none pointer-events-none ${rarityConfig.kanjiWatermark}`}>
          {card.kanji || '忍'}
        </div>

        {/* Cantoneiras Estilizadas para Raro e Lendário */}
        {rarityConfig.cornerGlyph && (
          <>
            <span className="absolute top-2.5 left-3 text-[10px] font-mono select-none opacity-60" style={{ color: rarityConfig.accentColor }}>
              {rarityConfig.cornerGlyph}
            </span>
            <span className="absolute bottom-2.5 left-3 text-[10px] font-mono select-none opacity-60" style={{ color: rarityConfig.accentColor }}>
              {rarityConfig.cornerGlyph}
            </span>
            <span className="absolute bottom-2.5 right-3 text-[10px] font-mono select-none opacity-60" style={{ color: rarityConfig.accentColor }}>
              {rarityConfig.cornerGlyph}
            </span>
          </>
        )}

        {/* Botão de Fechar no Canto Superior Direito */}
        <button
          onClick={() => {
            soundFx.playButtonClick();
            onClose();
          }}
          className="absolute top-3 right-3 z-30 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* ========================================================= */}
        {/* CABEÇALHO DO MODAL                                        */}
        {/* ========================================================= */}
        <div className="relative z-10 flex items-center justify-between pr-8 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Pilar */}
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 shadow-sm"
              style={{
                color: pillar.color,
                borderColor: `${pillar.color}50`,
                backgroundColor: `${pillar.color}20`,
              }}
            >
              <span>{pillar.badgeIcon}</span>
              <span>{pillar.name}</span>
            </span>

            {/* Dia */}
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/50 border border-white/10 text-slate-200">
              DIA #{card.unlockedDay}
            </span>
          </div>

          {/* Faixa de Raridade */}
          <span className={`text-[8px] sm:text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full border shadow-sm ${rarityConfig.ribbonBg}`}>
            {rarityConfig.tierName}
          </span>
        </div>

        {/* ========================================================= */}
        {/* CORPO CENTRAL DO PERGAMINHO                               */}
        {/* ========================================================= */}
        <div className="relative z-10 py-3 sm:py-3.5 text-center space-y-2.5 my-auto">
          {/* Emblema Shinobi */}
          <div className="relative inline-block mx-auto">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl flex items-center justify-center p-1.5 relative transition-transform ${rarityConfig.emblemBg}`}>
              <img 
                src={rarityConfig.emblemImg} 
                alt={card.title} 
                className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
              />
            </div>

            {/* Selo Kanji */}
            {card.kanji && (
              <div 
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-serif text-[10px] font-bold text-white shadow-md border border-white/20"
                style={{ backgroundColor: rarityConfig.sealBg }}
              >
                {card.kanji}
              </div>
            )}
          </div>

          {/* Título & Conceito */}
          <div>
            <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 leading-tight">
              {card.title}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider mt-0.5" style={{ color: rarityConfig.accentColor }}>
              {card.concept}
            </p>
          </div>

          {/* Citação de Sabedoria em Destaque */}
          <div className="relative px-3.5 py-2.5 bg-black/40 rounded-xl border border-white/10 mx-1">
            <span className="text-xl font-serif absolute -top-1.5 left-2 opacity-40 select-none" style={{ color: rarityConfig.accentColor }}>“</span>
            <p className="text-xs sm:text-sm text-slate-100 font-serif italic leading-relaxed px-2">
              {card.wisdom}
            </p>
            <span className="text-xl font-serif absolute -bottom-2.5 right-2 opacity-40 select-none" style={{ color: rarityConfig.accentColor }}>”</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RODAPÉ DO MODAL: AÇÃO PRÁTICA E BOTÃO DE FECHAR            */}
        {/* ========================================================= */}
        <div className="relative z-10 space-y-2 pt-2 border-t border-white/10">
          {/* Missão de Aplicação Prática Imediata */}
          <div className="bg-black/35 px-3 py-2 rounded-xl border border-white/10 flex items-start gap-2 text-left">
            <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-snug">
              <span className="font-bold text-emerald-400 font-mono uppercase mr-1.5">Ação Prática:</span>
              <span className="text-slate-200">{card.actionTip}</span>
            </div>
          </div>

          {/* Botão de Fechar / Integrar */}
          <button
            onClick={() => {
              soundFx.playButtonClick();
              onClose();
            }}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${rarityConfig.btnGradient}`}
          >
            <Check className="w-4 h-4" />
            <span>Integrar Sabedoria ao Treino</span>
          </button>
        </div>
      </div>
    </div>
  );
};
