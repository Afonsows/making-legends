import React, { useState } from 'react';
import { TeachingCard } from '../../core/types';
import { useTheme } from '../../theme/ThemeContext';
import { 
  X, 
  Share2, 
  Check, 
  Sparkles, 
  Copy, 
  Flame, 
  Zap, 
  Award, 
  Crown,
  Camera
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface TeachingCardModalProps {
  card: TeachingCard | null;
  onClose: () => void;
}

export const TeachingCardModal: React.FC<TeachingCardModalProps> = ({ card, onClose }) => {
  const { getPillar } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!card) return null;

  const pillar = getPillar(card.pillarId);

  const handleShareOrCopy = async () => {
    soundFx.playButtonClick();
    const shareText = `📜 Pergaminho de Sabedoria #${card.unlockedDay}: ${card.title}\n\n"${card.wisdom}"\n\n⚡ Ação Prática: ${card.actionTip}\n\n⚔️ Forjado no Making Legends • Protocolo dos 66 Dias`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${card.title} • Making Legends`,
          text: shareText,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Erro ao copiar:', err);
    }
  };

  const rarityMeta = {
    common: {
      label: 'Comum • Fundamentos',
      badgeBg: 'bg-slate-800/80 text-slate-300 border-slate-600',
      sealColor: '#ef4444',
      glow: 'shadow-md',
      frameBorder: 'border-slate-700',
      kanjiWatermark: card.kanji || '忍',
      themeTitle: 'Pergaminho de Fundamentos Shinobi',
    },
    rare: {
      label: 'Raro • Fluxo de Chakra',
      badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60',
      sealColor: '#06b6d4',
      glow: 'shadow-glow-chakra',
      frameBorder: 'border-cyan-500/70',
      kanjiWatermark: card.kanji || '極',
      themeTitle: 'Pergaminho Arcano dos Elementos',
    },
    legendary: {
      label: 'Lendário • Mestria Ancestral',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-shinobi-gold text-slate-950 border-amber-400 font-extrabold',
      sealColor: '#f59e0b',
      glow: 'shadow-glow-gold',
      frameBorder: 'border-shinobi-gold border-2',
      kanjiWatermark: card.kanji || '龍',
      themeTitle: 'Pergaminho Sagrado dos Sannin',
    },
  }[card.rarity];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative my-auto">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4 sm:p-6 space-y-4">
          {/* ========================================================= */}
          {/* CARD VISUAL SHAREÁVEL ESTILO INSTAGRAM / STORIES           */}
          {/* ========================================================= */}
          <div 
            className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
              card.rarity === 'legendary'
                ? 'bg-gradient-to-b from-[#241202] via-[#170e03] to-[#0c0802] border-2 border-amber-500/80 shadow-glow-gold/30'
                : card.rarity === 'rare'
                ? 'bg-gradient-to-b from-[#082032] via-[#05131f] to-[#020617] border border-cyan-500/60 shadow-glow-chakra/20'
                : 'bg-gradient-to-b from-[#18181b] via-[#111113] to-[#09090b] border border-slate-700'
            }`}
          >
            {/* Decorações de Fundo por Raridade */}
            {card.rarity === 'legendary' && (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-rose-950/20 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-shinobi-gold to-rose-500" />
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              </>
            )}

            {card.rarity === 'rare' && (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-purple-950/20 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500" />
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              </>
            )}

            {card.rarity === 'common' && (
              <>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-700" />
              </>
            )}

            {/* Kanji Gigante de Fundo (Watermark) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-8xl sm:text-9xl font-serif font-black select-none pointer-events-none opacity-5 sm:opacity-10 text-white">
              {rarityMeta.kanjiWatermark}
            </div>

            {/* Moldura Interna de Pergaminho */}
            <div className="p-5 sm:p-6 relative z-10 space-y-4">
              {/* Cabeçalho do Card Instagram */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-400">
                    MAKING LEGENDS
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] font-mono text-shinobi-gold font-bold">
                    DIA #{card.unlockedDay}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
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
                </div>
              </div>

              {/* Título & Conceito */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${rarityMeta.badgeBg}`}>
                    {rarityMeta.label}
                  </span>
                  {card.sealName && (
                    <span className="text-[9px] font-mono text-slate-400 italic">
                      {card.sealName}
                    </span>
                  )}
                </div>
                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                  {card.title}
                </h3>
                <p className="text-[11px] font-mono text-shinobi-gold mt-0.5">
                  Conceito: {card.concept}
                </p>
              </div>

              {/* A Frase / Ensinamento Central Estilizada */}
              <div className="relative py-2 px-1">
                <span className="text-3xl font-serif text-shinobi-gold/40 absolute -top-3 -left-1">“</span>
                <p className="text-sm sm:text-base text-slate-100 font-serif italic leading-relaxed pl-4 border-l-2 border-shinobi-gold/60">
                  {card.wisdom}
                </p>
                <span className="text-3xl font-serif text-shinobi-gold/40 absolute -bottom-4 right-2">”</span>
              </div>

              {/* Rodapé do Card Instagram com Selo de Lacre Shinobi */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-shinobi-gold" />
                  Sabedoria dos 66 Dias
                </span>

                {/* Selo Vermelho / Dourado Shinobi */}
                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                  <div 
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow"
                    style={{ backgroundColor: rarityMeta.sealColor }}
                  >
                    {card.kanji || '印'}
                  </div>
                  <span className="text-[10px] font-mono text-slate-300 font-bold">SELO SHINOBI</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* BOTÃO DE COMPARTILHAMENTO INSTAGRAM / REDES SOCIAIS       */}
          {/* ========================================================= */}
          <div className="flex gap-2">
            <button
              onClick={handleShareOrCopy}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Card Copiado para Postar!</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar Sabedoria (Instagram / Stories)</span>
                </>
              )}
            </button>
          </div>

          {/* ========================================================= */}
          {/* MISSÃO DE APLICAÇÃO PRÁTICA DO DIA                         */}
          {/* ========================================================= */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-left">
            <div className="text-[11px] font-bold text-emerald-400 font-mono uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Missão de Aplicação Prática Imediata:
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {card.actionTip}
            </p>
          </div>

          {/* Botão de Conclusão */}
          <button
            onClick={() => {
              soundFx.playButtonClick();
              onClose();
            }}
            className="w-full py-2.5 bg-shinobi-gold text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold hover:bg-shinobi-goldHover transition-colors cursor-pointer"
          >
            Integrar Sabedoria ao Treino
          </button>
        </div>
      </div>
    </div>
  );
};
