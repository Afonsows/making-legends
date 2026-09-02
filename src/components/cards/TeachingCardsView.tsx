import React, { useState } from 'react';
import { teachingCards } from '../../core/cardsData';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { TeachingCard } from '../../core/types';
import { PillarId } from '../../theme/types';
import { TeachingCardModal } from './TeachingCardModal';
import { 
  BookOpen, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Trophy, 
  Users, 
  Medal, 
  Share2,
  Crown,
  Flame,
  Zap
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

export const TeachingCardsView: React.FC = () => {
  const { profile } = useUserStore();
  const { theme, getPillar } = useTheme();

  const [selectedPillar, setSelectedPillar] = useState<PillarId | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'cards' | 'leagues'>('cards');
  const [activeCardModal, setActiveCardModal] = useState<TeachingCard | null>(null);

  const currentDay = Math.min(
    66,
    Math.max(1, profile.activeChallenge?.currentDay || profile.currentProtocolDay || 1)
  );

  const unlockedCardsList = teachingCards.filter(
    (card) => card.unlockedDay <= currentDay && (profile.unlockedCards || []).includes(card.id)
  );
  const unlockedCount = unlockedCardsList.length;
  const totalCards = teachingCards.length;

  const filteredCards = [...teachingCards]
    .filter((card) => {
      if (selectedPillar !== 'all' && card.pillarId !== selectedPillar) return false;
      return true;
    })
    .sort((a, b) => a.unlockedDay - b.unlockedDay);

  const pillarsList: { id: PillarId | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'taijutsu', label: '🥋 Corpo' },
    { id: 'ninjutsu', label: '📜 Mente' },
    { id: 'chakra', label: '⚡ Disciplina' },
    { id: 'espirito', label: '🛡️ Confiança' },
    { id: 'genjutsu', label: '👁️ Foco' },
  ];

  // Dados mock de Liga Shinobi
  const mockLeagueMembers = [
    { rank: 1, name: 'Sombra do Trovão', level: 24, xpWeek: 1420, badge: '⚡', isUser: false },
    { rank: 2, name: profile.name, level: profile.level, xpWeek: 1180, badge: '🥷', isUser: true },
    { rank: 3, name: 'Guardião de Bambu', level: 19, xpWeek: 960, badge: '🎋', isUser: false },
    { rank: 4, name: 'Ermitão do Lago', level: 16, xpWeek: 840, badge: '🌊', isUser: false },
    { rank: 5, name: 'Lâmina Errante', level: 14, xpWeek: 720, badge: '🗡️', isUser: false },
  ];

  return (
    <div className="pb-24 pt-3 max-w-4xl mx-auto px-4 space-y-4">
      {/* Header com Seletor de Aba */}
      <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Pergaminhos & Ligas Shinobi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cartões colecionáveis de sabedoria prática e ranking semanal da Temporada 1.
          </p>
        </div>

        {/* Alternador de Modo */}
        <div className="flex items-center gap-1 bg-shinobi-bg p-1 rounded-xl border border-shinobi-border self-start sm:self-center">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-shinobi-gold text-shinobi-bg shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Coleção ({unlockedCount}/{totalCards})</span>
          </button>
          <button
            onClick={() => setActiveTab('leagues')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'leagues'
                ? 'bg-shinobi-gold text-shinobi-bg shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Liga Prata III</span>
          </button>
        </div>
      </div>

      {/* ABA 1: PERGAMINHOS DE ENSINAMENTO */}
      {activeTab === 'cards' && (
        <div className="space-y-3">
          {/* Filtro de Pilares */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {pillarsList.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPillar(p.id)}
                className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition-all border font-semibold cursor-pointer ${
                  selectedPillar === p.id
                    ? 'bg-slate-900 border-2 border-shinobi-gold text-shinobi-gold font-bold shadow-glow-gold/20 scale-105'
                    : 'bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Grid Compacta de Cartões Colecionáveis com Design Contrastante por Raridade */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredCards.map((card) => {
              const isUnlocked = card.unlockedDay <= currentDay && (profile.unlockedCards || []).includes(card.id);
              const pillar = getPillar(card.pillarId);

              // 1. ESTILOS VISUAIS FORTEMENTE CONTRASTANTES POR RARIDADE
              const rarityTheme = {
                common: {
                  container: isUnlocked
                    ? 'bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 shadow-md'
                    : 'bg-slate-950/70 border border-slate-850 opacity-40 grayscale',
                  badge: 'bg-slate-800 text-slate-400 border border-slate-700',
                  badgeText: 'COMUM',
                  titleColor: 'text-slate-200 group-hover:text-white',
                  cornerGlyph: null,
                  kanjiGlow: 'opacity-5 text-slate-400',
                  glowEffect: '',
                  accentTag: '✦ Fundamento',
                  accentColor: 'text-slate-400',
                },
                rare: {
                  container: isUnlocked
                    ? 'bg-gradient-to-b from-[#06283d]/90 via-slate-950 to-slate-950 border-2 border-cyan-400/90 shadow-[0_0_18px_rgba(6,182,212,0.35)] hover:border-cyan-300 hover:scale-[1.02]'
                    : 'bg-slate-950/70 border-2 border-cyan-900/40 opacity-40 grayscale',
                  badge: 'bg-cyan-950 text-cyan-300 border border-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]',
                  badgeText: '⚡ RARO',
                  titleColor: 'text-cyan-50 group-hover:text-cyan-300',
                  cornerGlyph: '⚡',
                  kanjiGlow: 'opacity-15 text-cyan-400 group-hover:opacity-25',
                  glowEffect: 'shadow-glow-chakra',
                  accentTag: '⚡ Fluxo Chakra',
                  accentColor: 'text-cyan-400',
                },
                legendary: {
                  container: isUnlocked
                    ? 'bg-gradient-to-b from-[#3a1b02] via-[#1a0e02] to-slate-950 border-2 border-amber-400 shadow-[0_0_26px_rgba(245,158,11,0.55)] hover:border-amber-300 hover:scale-[1.03]'
                    : 'bg-slate-950/70 border-2 border-amber-900/40 opacity-40 grayscale',
                  badge: 'bg-gradient-to-r from-amber-500 via-shinobi-gold to-amber-400 text-slate-950 font-black border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.7)]',
                  badgeText: '👑 LENDÁRIO ★★★',
                  titleColor: 'text-amber-100 group-hover:text-amber-300 font-extrabold',
                  cornerGlyph: '❖',
                  kanjiGlow: 'opacity-20 text-amber-400 group-hover:opacity-35',
                  glowEffect: 'shadow-glow-gold',
                  accentTag: '👑 Mestria Sannin',
                  accentColor: 'text-amber-400',
                },
              }[card.rarity];

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (isUnlocked) {
                      soundFx.playButtonClick();
                      setActiveCardModal(card);
                    }
                  }}
                  className={`p-3 rounded-2xl transition-all relative overflow-hidden flex flex-col justify-between group ${
                    isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                  } ${rarityTheme.container}`}
                >
                  {/* Cantoneiras Estilizadas para Lendários e Raros */}
                  {rarityTheme.cornerGlyph && isUnlocked && (
                    <>
                      <span className="absolute top-1.5 left-1.5 text-[8px] opacity-60 font-mono select-none" style={{ color: card.rarity === 'legendary' ? '#f59e0b' : '#06b6d4' }}>
                        {rarityTheme.cornerGlyph}
                      </span>
                      <span className="absolute top-1.5 right-1.5 text-[8px] opacity-60 font-mono select-none" style={{ color: card.rarity === 'legendary' ? '#f59e0b' : '#06b6d4' }}>
                        {rarityTheme.cornerGlyph}
                      </span>
                    </>
                  )}

                  {/* Kanji Watermark visível */}
                  {card.kanji && (
                    <div className={`absolute right-1 bottom-1 text-5xl font-serif font-black select-none pointer-events-none transition-opacity ${rarityTheme.kanjiGlow}`}>
                      {card.kanji}
                    </div>
                  )}

                  <div className="space-y-2 relative z-10">
                    {/* Linha 1: Badge de Raridade Destacado + Selo de Desbloqueio/Dia */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[8px] font-mono tracking-wider px-1.5 py-0.5 rounded uppercase ${rarityTheme.badge}`}>
                        {rarityTheme.badgeText}
                      </span>

                      {isUnlocked ? (
                        <span className="text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Dia #{card.unlockedDay}
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-500 flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Dia #{card.unlockedDay}
                        </span>
                      )}
                    </div>

                    {/* Linha 2: Badge do Pilar */}
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 truncate"
                        style={{
                          color: pillar.color,
                          borderColor: `${pillar.color}40`,
                          backgroundColor: `${pillar.color}15`,
                        }}
                      >
                        <span>{pillar.badgeIcon}</span>
                        <span className="truncate">{pillar.name}</span>
                      </span>
                    </div>

                    {/* TÍTULO DO PERGAMINHO (HERO PRINCIPAL DO CARD) */}
                    <div className="pt-0.5">
                      <h4 className={`font-cinzel text-xs sm:text-sm font-bold leading-tight line-clamp-2 transition-colors ${rarityTheme.titleColor}`}>
                        {card.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                        {card.concept}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé Compacto com Sub-rótulo */}
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono relative z-10">
                    <span className={`font-semibold ${rarityTheme.accentColor}`}>
                      {rarityTheme.accentTag}
                    </span>
                    <span className="text-slate-400">
                      {isUnlocked ? 'Ver Card ➔' : 'Bloqueado'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA 2: LIGA SHINOBI E RANKING SOCIAL */}
      {activeTab === 'leagues' && (
        <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40">
                TEMPORADA 1
              </span>
              <h3 className="font-cinzel text-base font-bold text-slate-100 mt-1 flex items-center gap-2">
                <Medal className="w-5 h-5 text-shinobi-gold" />
                Liga Prata III — Divisão dos Guerreiros
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Termina em 3 dias
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Os 3 melhores ninjas sobem para a <strong>Liga Ouro I</strong> no encerramento do ciclo semanal.
          </p>

          <div className="space-y-2">
            {mockLeagueMembers.map((member) => (
              <div
                key={member.rank}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  member.isUser
                    ? 'bg-shinobi-gold/10 border-shinobi-gold/60 shadow-glow-gold/20'
                    : 'bg-shinobi-bg border-shinobi-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-mono font-bold text-sm ${
                    member.rank === 1 ? 'text-amber-400' : member.rank === 2 ? 'text-slate-300' : 'text-amber-600'
                  }`}>
                    #{member.rank}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm">
                    {member.badge}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{member.name}</span>
                      {member.isUser && (
                        <span className="text-[9px] font-mono bg-shinobi-gold text-shinobi-bg px-1.5 rounded font-bold">
                          VOCÊ
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">Nível {member.level}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-shinobi-gold">
                    {member.xpWeek} XP
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">esta semana</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Leitura e Compartilhamento Instagram do Cartão */}
      {activeCardModal && (
        <TeachingCardModal
          card={activeCardModal}
          onClose={() => setActiveCardModal(null)}
        />
      )}
    </div>
  );
};
