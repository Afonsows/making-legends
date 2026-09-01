import React, { useState } from 'react';
import { teachingCards } from '../../core/cardsData';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { PillarId } from '../../theme/types';
import { 
  BookOpen, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Trophy, 
  Users, 
  Medal, 
  Share2 
} from 'lucide-react';

export const TeachingCardsView: React.FC = () => {
  const { profile } = useUserStore();
  const { theme, getPillar } = useTheme();

  const [selectedPillar, setSelectedPillar] = useState<PillarId | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'cards' | 'leagues'>('cards');
  const [activeCardModal, setActiveCardModal] = useState<typeof teachingCards[0] | null>(null);

  const unlockedCount = profile.unlockedCards.length;
  const totalCards = teachingCards.length;

  const filteredCards = teachingCards.filter((card) => {
    if (selectedPillar !== 'all' && card.pillarId !== selectedPillar) return false;
    return true;
  });

  const pillarsList: { id: PillarId | 'all'; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'taijutsu', label: 'Corpo' },
    { id: 'ninjutsu', label: 'Mente' },
    { id: 'chakra', label: 'Disciplina' },
    { id: 'espirito', label: 'Confiança' },
    { id: 'genjutsu', label: 'Foco' },
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
            Cartões de sabedoria colecionáveis e ranking semanal da Temporada 1.
          </p>
        </div>

        {/* Alternador de Modo */}
        <div className="flex items-center gap-1 bg-shinobi-bg p-1 rounded-xl border border-shinobi-border self-start sm:self-center">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'cards'
                ? 'bg-shinobi-gold text-shinobi-bg shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Coleção ({unlockedCount}/{totalCards})</span>
          </button>
          <button
            onClick={() => setActiveTab('leagues')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'leagues'
                ? 'bg-shinobi-gold text-shinobi-bg shadow-sm'
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {pillarsList.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPillar(p.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all border font-semibold ${
                  selectedPillar === p.id
                    ? 'bg-slate-900 border-2 border-shinobi-gold text-shinobi-gold font-bold shadow-glow-gold/20'
                    : 'bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Grid de Cartões Colecionáveis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredCards.map((card) => {
              const isUnlocked = profile.unlockedCards.includes(card.id);
              const pillar = getPillar(card.pillarId);

              return (
                <div
                  key={card.id}
                  onClick={() => isUnlocked && setActiveCardModal(card)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-lg ${
                    isUnlocked
                      ? 'bg-slate-900 border-slate-700 hover:border-shinobi-gold/80 hover:shadow-2xl hover:scale-[1.01]'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
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

                      {isUnlocked ? (
                        <span className="text-[10px] font-mono text-shinobi-jade flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Desbloqueado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Dia {card.unlockedDay}
                        </span>
                      )}
                    </div>

                    <h4 className="font-cinzel text-sm font-bold text-slate-100">
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                      {isUnlocked ? card.wisdom : 'Sabedoria oculta selada no pergaminho...'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-shinobi-border/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">{card.concept}</span>
                    <span className="text-shinobi-gold capitalize font-semibold">{card.rarity}</span>
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

      {/* Modal de Leitura do Cartão */}
      {activeCardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-shinobi-card border border-shinobi-gold/60 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 relative z-[101]">
            <div className="text-center space-y-3">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40">
                PERGAMINHO DE ENSINAMENTO #{activeCardModal.unlockedDay}
              </span>

              <h3 className="font-cinzel text-xl font-bold text-slate-100">
                {activeCardModal.title}
              </h3>

              <div className="w-12 h-0.5 bg-shinobi-gold mx-auto" />

              <p className="text-sm text-slate-200 italic leading-relaxed py-2">
                "{activeCardModal.wisdom}"
              </p>

              <div className="bg-shinobi-bg p-3.5 rounded-xl border border-shinobi-border text-left">
                <div className="text-[11px] font-bold text-shinobi-jade font-mono uppercase mb-1">
                  ⚡ Missão de Aplicação Prática:
                </div>
                <div className="text-xs text-slate-300">
                  {activeCardModal.actionTip}
                </div>
              </div>

              <button
                onClick={() => setActiveCardModal(null)}
                className="w-full py-2.5 bg-shinobi-gold text-shinobi-bg font-bold text-xs rounded-xl shadow-glow-gold hover:bg-shinobi-goldHover transition-colors mt-4"
              >
                Integrar Sabedoria ao Treino
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
