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

  // Metadados visuais específicos e contrastantes por raridade
  const rarityConfig = {
    common: {
      tierName: 'FUNDAMENTOS SHINOBI',
      emblemImg: '/images/cards/emblem_common.png',
      outerBorder: 'border-slate-700/80 shadow-[0_10px_30px_rgba(0,0,0,0.8)]',
      innerBorder: 'border-slate-800/80',
      bgGradient: 'bg-gradient-to-b from-[#18181b] via-[#101013] to-[#09090b]',
      ribbonBg: 'bg-slate-800/80 text-slate-300 border-slate-600',
      accentColor: '#94a3b8',
      kanjiColor: 'text-slate-600/20',
      sealBg: '#ef4444',
      sealText: '印',
      cornerGlyph: '✦',
    },
    rare: {
      tierName: 'FLUXO DE CHAKRA ARCANO',
      emblemImg: '/images/cards/emblem_rare.png',
      outerBorder: 'border-2 border-cyan-400/90 shadow-[0_0_35px_rgba(6,182,212,0.45)]',
      innerBorder: 'border-cyan-500/50',
      bgGradient: 'bg-gradient-to-b from-[#082032] via-[#05131f] to-[#020617]',
      ribbonBg: 'bg-cyan-950 text-cyan-300 border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]',
      accentColor: '#06b6d4',
      kanjiColor: 'text-cyan-400/20',
      sealBg: '#0891b2',
      sealText: '気',
      cornerGlyph: '⚡',
    },
    legendary: {
      tierName: 'MESTRIA ANCESTRAL DOS SANNIN',
      emblemImg: '/images/cards/emblem_legendary.png',
      outerBorder: 'border-2 border-amber-400 shadow-[0_0_45px_rgba(245,158,11,0.65)]',
      innerBorder: 'border-2 border-amber-400/60',
      bgGradient: 'bg-gradient-to-b from-[#2b1602] via-[#180d02] to-[#0a0501]',
      ribbonBg: 'bg-gradient-to-r from-amber-500 via-shinobi-gold to-amber-400 text-slate-950 font-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.8)]',
      accentColor: '#f59e0b',
      kanjiColor: 'text-amber-400/25',
      sealBg: '#d97706',
      sealText: '龍',
      cornerGlyph: '❖',
    },
  }[card.rarity];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md my-auto space-y-3 relative py-2">
        {/* Botão de Fechar */}
        <button
          onClick={() => {
            soundFx.playButtonClick();
            onClose();
          }}
          className="absolute -top-1.5 -right-1.5 z-30 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ========================================================= */}
        {/* CARD COM PROPORÇÃO 9:16 REAL E ESTÉTICA COLECIONÁVEL      */}
        {/* ========================================================= */}
        <div 
          className={`aspect-[9/16] w-full rounded-3xl overflow-hidden relative flex flex-col justify-between p-4 sm:p-5 transition-all ${rarityConfig.bgGradient} ${rarityConfig.outerBorder}`}
        >
          {/* Efeitos de Fundo Luminosos */}
          {card.rarity === 'legendary' && (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/25 via-rose-950/20 to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-shinobi-gold to-rose-500 shadow-glow-gold" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            </>
          )}

          {card.rarity === 'rare' && (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-500/25 via-sky-950/20 to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 shadow-glow-chakra" />
              <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            </>
          )}

          {card.rarity === 'common' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-700" />
          )}

          {/* Kanji Gigante de Fundo (Watermark) */}
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-9xl font-serif font-black select-none pointer-events-none ${rarityConfig.kanjiColor}`}>
            {card.kanji || '忍'}
          </div>

          {/* Moldura Interna com Cantoneiras */}
          <div className={`absolute inset-2 sm:inset-2.5 rounded-2xl pointer-events-none border ${rarityConfig.innerBorder}`} />

          {/* Cantoneiras Estilizadas */}
          <span className="absolute top-3 left-3 text-xs font-mono select-none" style={{ color: rarityConfig.accentColor }}>
            {rarityConfig.cornerGlyph}
          </span>
          <span className="absolute top-3 right-3 text-xs font-mono select-none" style={{ color: rarityConfig.accentColor }}>
            {rarityConfig.cornerGlyph}
          </span>
          <span className="absolute bottom-3 left-3 text-xs font-mono select-none" style={{ color: rarityConfig.accentColor }}>
            {rarityConfig.cornerGlyph}
          </span>
          <span className="absolute bottom-3 right-3 text-xs font-mono select-none" style={{ color: rarityConfig.accentColor }}>
            {rarityConfig.cornerGlyph}
          </span>

          {/* ======================================================= */}
          {/* SEÇÃO 1: TOPO DO CARD 9:16                              */}
          {/* ======================================================= */}
          <div className="relative z-10 space-y-2 pt-1 text-center">
            {/* Faixa de Raridade Superior */}
            <div className="flex items-center justify-center">
              <span className={`text-[9px] sm:text-[10px] font-mono tracking-widest uppercase px-3 py-0.5 rounded-full border shadow-sm ${rarityConfig.ribbonBg}`}>
                {rarityConfig.tierName}
              </span>
            </div>

            {/* Cabeçalho com Pilar e Dia */}
            <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-300">
              <span
                className="font-bold px-2 py-0.5 rounded border flex items-center gap-1 shadow-sm"
                style={{
                  color: pillar.color,
                  borderColor: `${pillar.color}50`,
                  backgroundColor: `${pillar.color}20`,
                }}
              >
                <span>{pillar.badgeIcon}</span>
                <span>{pillar.name}</span>
              </span>

              <span className="font-bold px-2 py-0.5 rounded bg-black/60 border border-white/10 text-slate-200">
                DIA #{card.unlockedDay}
              </span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* SEÇÃO 2: CENTRO COM EMBLEMA ARTÍSTICO & TÍTULO           */}
          {/* ======================================================= */}
          <div className="relative z-10 space-y-3 text-center my-auto py-2">
            {/* Emblema Temático Shinobi da Identidade Visual */}
            <div className="relative inline-block mx-auto">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl flex items-center justify-center p-2 relative transition-transform ${
                card.rarity === 'legendary'
                  ? 'bg-amber-950/60 border-2 border-amber-400 shadow-glow-gold'
                  : card.rarity === 'rare'
                  ? 'bg-cyan-950/60 border-2 border-cyan-400 shadow-glow-chakra'
                  : 'bg-slate-900/80 border border-slate-700 shadow-md'
              }`}>
                <img 
                  src={rarityConfig.emblemImg} 
                  alt={card.title} 
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                />
              </div>

              {/* Kanji Flutuante */}
              {card.kanji && (
                <div 
                  className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center font-serif text-xs font-bold text-white shadow-lg border border-white/20"
                  style={{ backgroundColor: rarityConfig.sealBg }}
                >
                  {card.kanji}
                </div>
              )}
            </div>

            {/* Título do Pergaminho */}
            <div className="space-y-0.5 px-2">
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 leading-tight">
                {card.title}
              </h3>
              <p className="text-[10px] sm:text-[11px] font-mono font-medium tracking-wide uppercase" style={{ color: rarityConfig.accentColor }}>
                {card.concept}
              </p>
            </div>

            {/* Frase / Ensinamento Central em Destaque */}
            <div className="relative px-3 py-2 bg-black/40 rounded-xl border border-white/10 mx-1">
              <span className="text-2xl font-serif absolute -top-2 left-2 opacity-50 select-none" style={{ color: rarityConfig.accentColor }}>“</span>
              <p className="text-xs sm:text-sm text-slate-100 font-serif italic leading-relaxed py-1 px-2">
                {card.wisdom}
              </p>
              <span className="text-2xl font-serif absolute -bottom-3 right-2 opacity-50 select-none" style={{ color: rarityConfig.accentColor }}>”</span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* SEÇÃO 3: RODAPÉ DO CARD 9:16 COM SELO ANCESTRAL         */}
          {/* ======================================================= */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" style={{ color: rarityConfig.accentColor }} />
              <span className="tracking-wider uppercase font-semibold text-slate-300">
                {card.sealName || 'Selo de Sabedoria'}
              </span>
            </div>

            {/* Selo Tradicional de Lacre */}
            <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
              <span 
                className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: rarityConfig.sealBg }}
              >
                {rarityConfig.sealText}
              </span>
              <span className="text-[9px] font-bold text-slate-200">SHINOBI</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MISSÃO DE APLICAÇÃO PRÁTICA IMEDIATA                       */}
        {/* ========================================================= */}
        <div className="bg-slate-900/95 p-3.5 rounded-2xl border border-slate-800 space-y-1 text-left shadow-lg">
          <div className="text-[10px] font-bold text-emerald-400 font-mono uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Missão de Aplicação Prática:
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {card.actionTip}
          </p>
        </div>

        {/* Botão de Fechar / Integrar */}
        <button
          onClick={() => {
            soundFx.playButtonClick();
            onClose();
          }}
          className="w-full py-2.5 bg-gradient-to-r from-shinobi-gold to-amber-500 hover:opacity-95 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Integrar Sabedoria ao Treino</span>
        </button>
      </div>
    </div>
  );
};
