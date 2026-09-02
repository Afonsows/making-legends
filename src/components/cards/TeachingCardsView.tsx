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

  const unlockedCount = profile.unlockedCards.length;
  const totalCards = teachingCards.length;

  const filteredCards = teachingCards.filter((card) => {
    if (selectedPillar !== 'all' && card.pillarId !== selectedPillar) return false;
    return true;
  });

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

          {/* Grid Compacta de Cartões Colecionáveis com Design por Raridade */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredCards.map((card) => {
              const isUnlocked = profile.unlockedCards.includes(card.id);
              const pillar = getPillar(card.pillarId);

              // Estilos visuais diferenciados por raridade
              const rarityCardStyles = {
                common: isUnlocked
                  ? 'bg-slate-950/90 border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                  : 'bg-slate-950/60 border-slate-850 opacity-50 grayscale',
                rare: isUnlocked
                  ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border-cyan-500/70 hover:border-cyan-400 shadow-glow-chakra/20 hover:scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-850 opacity-50 grayscale',
                legendary: isUnlocked
                  ? 'bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-950 border-2 border-shinobi-gold hover:border-amber-300 shadow-glow-gold/30 hover:scale-[1.03]'
                  : 'bg-slate-950/60 border-slate-850 opacity-50 grayscale',
              }[card.rarity];

              const rarityBadge = {
                common: 'text-slate-400 bg-slate-800/60 border-slate-700',
                rare: 'text-cyan-300 bg-cyan-950/80 border-cyan-500/50 font-bold',
                legendary: 'text-amber-300 bg-amber-950/80 border-amber-500/70 font-extrabold',
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
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between shadow-md group ${
                    isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                  } ${rarityCardStyles}`}
                >
                  {/* Detalhe Shinobi de Canto para Lendários */}
                  {card.rarity === 'legendary' && isUnlocked && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-shinobi-gold text-slate-950 flex items-center justify-center rounded-bl-xl text-[9px] font-bold shadow">
                      ★
                    </div>
                  )}

                  {/* Kanji Watermark em Cartões Raros e Lendários */}
                  {isUnlocked && card.kanji && (
                    <div className="absolute right-1 bottom-1 text-4xl font-serif font-black select-none pointer-events-none opacity-5 group-hover:opacity-15 transition-opacity text-white">
                      {card.kanji}
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* Linha Superior: Pilar + Status / Dia */}
                    <div className="flex items-center justify-between gap-1">
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

                      {isUnlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <span className="text-[9px] font-mono text-slate-500 flex items-center gap-0.5 flex-shrink-0">
                          <Lock className="w-3 h-3" /> D.{card.unlockedDay}
                        </span>
                      )}
                    </div>

                    {/* TÍTULO PRINCIPAL DO PERGAMINHO */}
                    <div>
                      <h4 className="font-cinzel text-xs sm:text-sm font-bold text-slate-100 group-hover:text-shinobi-gold transition-colors line-clamp-2 leading-tight">
                        {card.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                        {card.concept}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé Compacto */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                    <span className={`px-1.5 py-0.2 rounded border uppercase text-[8px] ${rarityBadge}`}>
                      {card.rarity}
                    </span>
                    <span className="text-slate-400">
                      Dia #{card.unlockedDay}
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
