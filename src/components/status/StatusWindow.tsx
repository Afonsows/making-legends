import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { RadarChart } from './RadarChart';
import { getLevelProgress } from '../../core/xpEngine';
import { getDefaultRyoReward } from '../../core/ryoEngine';
import { evaluateProtocolStatus } from '../../core/streakEngine';
import { soundFx } from '../../utils/audio';
import { 
  Shield, 
  Flame, 
  Sparkles, 
  Award, 
  Zap, 
  AlertTriangle, 
  Edit, 
  Check,
  Lock,
  ChevronRight,
  User,
  Mail,
  Phone,
  Save,
  CheckCircle2,
  Cloud,
  Coins,
  History, 
  RotateCcw, 
  BarChart3, 
  Sliders,
  Map,
  PackageOpen,
  Backpack,
  Swords,
  BookOpen,
  FlaskConical,
  ShoppingBag
} from 'lucide-react';
import { allGameItems } from '../../core/itemsData';
import { EditProfileModal } from '../modals/EditProfileModal';
import { ShopPanel } from './ShopPanel';
import { ChallengeMapModal } from '../modals/ChallengeMapModal';
import { ChallengeHistoryModal } from '../modals/ChallengeHistoryModal';

interface StatusWindowProps {
  onOpenAvatarCustomizer?: () => void;
}

export const StatusWindow: React.FC<StatusWindowProps> = () => {
  const { 
    profile, 
    toggleHardMode, 
    equipItem, 
    unequipItem, 
    getEquippedItems,
    updateProfile,
    isChallengeMapModalOpen,
    openChallengeMapModal,
    closeChallengeMapModal,
    isChallengeHistoryModalOpen,
    openChallengeHistoryModal,
    closeChallengeHistoryModal,
    openStartChallengeModal
  } = useUserStore();
  const { missionLogs, recalibrateFromMissions, missions } = useHabitStore();
  const { getRankByLevel, theme } = useTheme();

  const protocolStatus = evaluateProtocolStatus(profile, missions);
  const hasActiveChallenge = protocolStatus.hasActiveChallenge;

  // Sub-abas do Pergaminho de Status
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'inventory' | 'shop' | 'history'>('stats');
  const [inventoryCategory, setInventoryCategory] = useState<'all' | 'gear' | 'relic' | 'scroll' | 'elixir'>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const rankInfo = getRankByLevel(profile.level);
  const { currentLevel, currentLevelXp, nextLevelXpThreshold, progressPercent } = getLevelProgress(profile.totalXp);
  const equippedList = getEquippedItems();

  const avatarDisplay = profile.avatarConfig.customEmoji || (profile.gender === 'female' ? '🥷‍♀️' : (rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge));

  const [recalibrateNotice, setRecalibrateNotice] = useState<string | null>(null);
  const [eliteNotice, setEliteNotice] = useState<string | null>(null);
  const completedDays = Object.values(profile.dayLog || {}).filter((d) => d.completed).length;

  const handleRecalibrate = () => {
    const result = recalibrateFromMissions();
    soundFx.playScrollOpen();
    setRecalibrateNotice(`Ficha verificada: ${result.totalXp} XP, Nível ${result.level}, ${result.ryo} Ryō. Nível, patente, sequência e mochila foram conferidos — nada foi apagado.`);
    setTimeout(() => {
      setRecalibrateNotice(null);
    }, 4000);
  };

  return (
    <div className="pb-nav pt-3 max-w-4xl mx-auto px-4 space-y-4">
      {/* Cabeçalho do Pergaminho de Status */}
      <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10">
          {/* Avatar com Aura de Chakra */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-shinobi-card to-slate-900 border-2 border-shinobi-gold flex items-center justify-center text-4xl shadow-glow-gold/40 relative hover:scale-105 transition-transform"
              title="Clique para trocar Avatar e Foto"
            >
              <span>{avatarDisplay}</span>
              <div className="absolute -bottom-2 -right-2 bg-shinobi-crimson text-white text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-shinobi-bg">
                Nv. {currentLevel}
              </div>
            </button>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute -top-1.5 -right-1.5 p-1.5 bg-shinobi-card border border-shinobi-gold/70 text-shinobi-gold hover:text-white hover:bg-shinobi-gold/20 rounded-full transition-colors shadow-lg"
              title="Editar Ficha e Foto"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nome e Títulos */}
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40 flex items-center gap-1.5">
                <span className="font-kanji text-sm leading-none">{rankInfo.kanji}</span>
                {rankInfo.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {profile.totalXp} XP Total
              </span>
              <span className="text-[10px] text-amber-300 font-mono px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 flex items-center gap-1">
                <span>🪙</span> {profile.ryo || 0} Ryō
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-100">
                {profile.name}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs text-shinobi-gold hover:text-amber-300 hover:underline flex items-center gap-1 font-mono font-bold"
              >
                (Editar Ficha & Avatar)
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {rankInfo.description}
            </p>

            {/* Barra de XP de Nível */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Progresso para o Nível {currentLevel + 1}</span>
                <span className="font-bold text-shinobi-gold">{progressPercent}% ({currentLevelXp}/{nextLevelXpThreshold} XP)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-shinobi-chakra via-shinobi-jade to-shinobi-gold transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Insígnia Oficial da Academia Shinobi */}
          <div className="hidden sm:flex flex-col items-center gap-1.5 shrink-0 p-2.5 rounded-2xl bg-black/40 border border-shinobi-border shadow-inner">
            <img
              src="/logo.png"
              alt="Making Legends"
              className="w-12 h-12 rounded-xl border border-shinobi-crimson/50 shadow-glow-crimson object-cover"
            />
            <span className="text-[9px] font-cinzel font-bold text-slate-300 tracking-wider">MAKING LEGENDS</span>
          </div>
        </div>
      </div>

      {/* SELETOR DE SUB-ABAS (ESTATÍSTICAS / INVENTÁRIO / EDITAR FICHA / HISTÓRICO) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl">
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'stats'
              ? 'bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 shadow-glow-gold font-bold scale-[1.02]'
              : 'bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Estatísticas</span>
        </button>

        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'inventory'
              ? 'bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 shadow-glow-gold font-bold scale-[1.02]'
              : 'bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Backpack className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Mochila ({profile.inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('shop')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'shop'
              ? 'bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 shadow-glow-gold font-bold scale-[1.02]'
              : 'bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
        >
          <ShoppingBag className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Loja</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'history'
              ? 'bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 shadow-glow-gold font-bold scale-[1.02]'
              : 'bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
        >
          <History className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Histórico</span>
        </button>
      </div>

      {/* SUB-ABA 1: ESTATÍSTICAS E PILARES */}
      {activeSubTab === 'stats' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Grid de Estatísticas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Saldo de Ryō */}
            <div className="bg-slate-900 border-2 border-amber-500/50 p-4 rounded-2xl text-center space-y-1 shadow-xl bg-amber-950/20">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center justify-center gap-1">
                <span>🪙</span> MOEDAS RYŌ
              </span>
              <div className="text-2xl font-cinzel font-bold text-amber-300">
                {profile.ryo || 0}
              </div>
              <p className="text-[10px] text-slate-300">
                gaste no Mercado
              </p>
            </div>

            {/* Dia do Protocolo */}
            <button
              type="button"
              onClick={hasActiveChallenge ? openChallengeMapModal : openStartChallengeModal}
              className="bg-slate-900 border-2 border-slate-700 hover:border-shinobi-gold p-4 rounded-2xl text-center space-y-1 shadow-xl hover:scale-105 transition-all cursor-pointer group"
              title={hasActiveChallenge ? "Clique para ver o mapa completo do desafio" : "Clique para iniciar um desafio"}
            >
              <span className="text-[10px] font-mono font-bold uppercase text-slate-300 group-hover:text-shinobi-gold tracking-wider flex items-center justify-center gap-1">
                <Map className="w-3 h-3 text-shinobi-gold" /> PROTOCOLO
              </span>
              {hasActiveChallenge ? (
                <>
                  <div className="text-2xl font-cinzel font-bold text-shinobi-gold">
                    Dia {profile.activeChallenge?.currentDay || 1}<span className="text-xs font-mono text-slate-400">/{profile.activeChallenge?.targetDays || 66}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 group-hover:text-slate-200">
                    {protocolStatus.phaseName}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-sm font-cinzel font-bold text-amber-400 py-1">
                    Sem Desafio Ativo
                  </div>
                  <p className="text-[10px] text-amber-400/80 group-hover:text-amber-300">
                    Toque para Iniciar ⚡
                  </p>
                </>
              )}
            </button>

            {/* Sequência Atual */}
            <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl text-center space-y-1 shadow-xl">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-shinobi-crimson" /> SEQUÊNCIA
              </span>
              <div className="text-2xl font-cinzel font-bold text-shinobi-crimson">
                {profile.currentStreak} <span className="text-xs font-mono text-slate-400">dias</span>
              </div>
              <p className="text-[10px] text-slate-300">
                Recorde: {profile.bestStreak} dias
              </p>
            </div>

            {/* Escudos de Chakra */}
            <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl text-center space-y-1 shadow-xl">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-shinobi-jade" /> ESCUDO CHAKRA
              </span>
              <div className="text-2xl font-cinzel font-bold text-shinobi-jade">
                {profile.weeklyShieldsRemaining}<span className="text-xs font-mono text-slate-400">/{profile.weeklyShieldsMax}</span>
              </div>
              <p className="text-[10px] text-slate-300">
                {profile.isHardModeEnabled ? 'Modo Elite: sem escudos' : 'protege a sequência'}
              </p>
            </div>

            {/* Pergaminhos Desbloqueados */}
            <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-2xl text-center space-y-1 shadow-xl col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-purple-400" /> PERGAMINHOS
              </span>
              <div className="text-2xl font-cinzel font-bold text-purple-400">
                {profile.unlockedCards.length}
              </div>
              <p className="text-[10px] text-slate-300">
                Cartas de sabedoria
              </p>
            </div>
          </div>

          {/* Radar Chart dos 5 Pilares */}
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-shinobi-gold" />
                  Equilíbrio dos 5 Pilares Shinobi
                </h3>
                <p className="text-xs text-slate-400">
                  Distribuição de XP acumulado por área de desenvolvimento pessoal
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 flex justify-center py-2">
                <RadarChart stats={profile.pillarXp} />
              </div>

              <div className="w-full md:w-1/2 space-y-2.5">
                {Object.entries(theme.pillars).map(([pillarKey, pillar]) => {
                  const xp = profile.pillarXp[pillarKey as keyof typeof profile.pillarXp] || 0;
                  return (
                    <div 
                      key={pillarKey}
                      className="p-3 rounded-2xl bg-slate-950 border-2 border-slate-800 flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{pillar.badgeIcon}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-100">{pillar.name}</div>
                          <div className="text-[10px] text-slate-400">{pillar.categoryLabel}</div>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-shinobi-gold">
                        {xp} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Equipamentos e Relíquias Ativas */}
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-shinobi-crimson" />
                  Relíquias & Buffs Equipados ({equippedList.length} Ativas)
                </h3>
                <p className="text-xs text-slate-400">
                  Itens ativos concedem bônus de XP, dano na arena e escudos.
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('inventory')}
                className="px-3 py-1.5 bg-shinobi-gold/20 border border-shinobi-gold/60 hover:bg-shinobi-gold/30 text-shinobi-gold text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Backpack className="w-3.5 h-3.5" />
                <span>Ver Mochila ({profile.inventory.length})</span>
              </button>
            </div>

            {equippedList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhuma relíquia equipada no momento. Abra a Mochila para equipar suas relíquias!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {equippedList.map((item) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-800 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{item.name}</div>
                        <div className="text-[10px] text-shinobi-gold font-mono">{item.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => unequipItem(item.id)}
                      className="text-[10px] font-mono text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/60 bg-slate-900 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Desequipar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveSubTab('inventory')}
              className="w-full py-2.5 bg-slate-950 border border-shinobi-gold/40 hover:border-shinobi-gold hover:bg-shinobi-gold/10 text-shinobi-gold text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow"
            >
              <PackageOpen className="w-4 h-4" />
              <span>Abrir Mochila & Gerenciar Inventário Completo ({profile.inventory.length} Relíquias)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alternar Modo Elite (Hard Mode) */}
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-cinzel text-sm sm:text-base font-bold text-slate-100">
                  Modo Elite (Treino Extremo)
                </h3>
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                <strong>+20% de XP em todas as missões</strong>, mas sem Escudo de Chakra e sem tolerância a faltas nos desafios.
                {hasActiveChallenge && ' Fica travado até o desafio atual terminar.'}
              </p>
              {eliteNotice && <p className="text-[11px] text-amber-300">{eliteNotice}</p>}
            </div>

            <button
              onClick={() => {
                const res = toggleHardMode();
                if (!res.success) {
                  soundFx.playError();
                  setEliteNotice(res.reason || null);
                  setTimeout(() => setEliteNotice(null), 4000);
                } else {
                  soundFx.playButtonClick();
                }
              }}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs font-mono transition-all ${
                profile.isHardModeEnabled
                  ? 'bg-rose-600 text-white shadow-glow-crimson'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              {profile.isHardModeEnabled ? 'MODO ELITE ATIVO' : 'ATIVAR MODO ELITE'}
            </button>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: INVENTÁRIO & MOCHILA SHINOBI */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Cabeçalho da Mochila */}
          <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold font-bold border border-shinobi-gold/40">
                  Mochila de Relíquias Shinobi
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {profile.inventory.length} Relíquias Desbloqueadas
                </span>
              </div>
              <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>Inventário & Equipamentos de Batalha</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Equipe relíquias para receber bônus passivos de XP em pilares específicos, dano no duelo e escudos.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <Zap className="w-4 h-4 text-shinobi-gold" />
              <div className="text-xs">
                <div className="font-bold text-slate-200">{equippedList.length} Ativas</div>
                <div className="text-[10px] text-slate-400">Slots ocupados</div>
              </div>
            </div>
          </div>

          {/* 1. PAINEL DE SLOTS DE EQUIPAMENTO ATIVO (4 SLOTS TEMÁTICOS) */}
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-shinobi-gold" />
                Slots de Equipamento Ativo (Máx. 1 por Tipo)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {equippedList.length} / 4 Slots Ocupados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: 'gear', label: 'Equipamento', icon: Swords, color: '#f43f5e' },
                { type: 'relic', label: 'Relíquia', icon: Sparkles, color: '#eab308' },
                { type: 'scroll', label: 'Pergaminho', icon: BookOpen, color: '#06b6d4' },
                { type: 'elixir', label: 'Elixir', icon: FlaskConical, color: '#10b981' },
              ].map((slot) => {
                const SlotIcon = slot.icon;
                const equippedInSlot = equippedList.find((item) => item.type === slot.type);

                return (
                  <div
                    key={slot.type}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      equippedInSlot
                        ? 'bg-slate-950 border-shinobi-gold/60 shadow-glow-gold/10'
                        : 'bg-slate-950/60 border-dashed border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                        <span className="flex items-center gap-1 font-bold uppercase" style={{ color: slot.color }}>
                          <SlotIcon className="w-3 h-3" /> {slot.label}
                        </span>
                        {equippedInSlot ? (
                          <span className="text-emerald-400 font-bold">ATIVO</span>
                        ) : (
                          <span className="text-slate-600">LIVRE</span>
                        )}
                      </div>

                      {equippedInSlot ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{equippedInSlot.icon}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-100 truncate">
                                {equippedInSlot.name}
                              </div>
                              <div className="text-[10px] text-shinobi-gold font-mono uppercase">
                                {equippedInSlot.rarity}
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-500/30">
                            ✨ +{equippedInSlot.buffValue}% {equippedInSlot.targetPillar ? equippedInSlot.targetPillar.toUpperCase() : equippedInSlot.buffType.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                      ) : (
                        <div className="py-3 text-center">
                          <SlotIcon className="w-6 h-6 mx-auto text-slate-700 mb-1" />
                          <p className="text-[11px] text-slate-500">Slot vazio</p>
                        </div>
                      )}
                    </div>

                    {equippedInSlot && (
                      <button
                        onClick={() => unequipItem(equippedInSlot.id)}
                        className="mt-3 w-full py-1.5 text-[10px] font-mono font-bold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900 border border-rose-800/60 rounded-xl transition-colors"
                      >
                        Desequipar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. GRADE DA MOCHILA (ITENS CONQUISTADOS) */}
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                  <PackageOpen className="w-4 h-4 text-shinobi-gold" />
                  Itens Guardados na Mochila ({profile.inventory.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em "Equipar" para ativar os efeitos da relíquia no seu guerreiro.
                </p>
              </div>

              {/* Filtros de Tipo */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'gear', label: '⚔️ Equipamentos' },
                  { id: 'relic', label: '🔮 Relíquias' },
                  { id: 'scroll', label: '📜 Pergaminhos' },
                  { id: 'elixir', label: '🧪 Elixires' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setInventoryCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      inventoryCategory === cat.id
                        ? 'bg-shinobi-gold text-slate-950 border-shinobi-gold font-bold shadow-glow-gold/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {profile.inventory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Sua mochila está vazia. Derrote adversários na Arena de Duelo para forjar relíquias!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {profile.inventory
                  .map((id) => allGameItems[id])
                  .filter(Boolean)
                  .filter((item) => inventoryCategory === 'all' || item.type === inventoryCategory)
                  .map((item) => {
                    const isEquipped = profile.equippedItems.includes(item.id);

                    const rarityColors: Record<string, string> = {
                      common: 'border-slate-600 text-slate-300 bg-slate-800/40',
                      rare: 'border-cyan-500/60 text-cyan-300 bg-cyan-950/30',
                      epic: 'border-purple-500/60 text-purple-300 bg-purple-950/30',
                      legendary: 'border-amber-500/80 text-amber-300 bg-amber-950/40 shadow-glow-gold/20',
                    };

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between shadow-lg relative ${
                          isEquipped
                            ? 'bg-slate-950 border-shinobi-gold/80 shadow-glow-gold/20 scale-[1.01]'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                              rarityColors[item.rarity] || rarityColors.common
                            }`}>
                              {item.rarity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              {item.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="text-3xl">{item.icon}</span>
                            <div>
                              <h4 className="font-cinzel text-sm font-bold text-slate-100">
                                {item.name}
                              </h4>
                              {item.targetPillar && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Pilar: {item.targetPillar.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-400 italic mb-3">
                            "{item.description}"
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <div className="text-xs font-mono font-bold text-emerald-400 flex items-center justify-between">
                            <span>Efeito do Buff:</span>
                            <span>+{item.buffValue}% {item.targetPillar ? item.targetPillar.toUpperCase() : item.buffType.replace('_', ' ').toUpperCase()}</span>
                          </div>

                          {isEquipped ? (
                            <div className="w-full py-2 bg-shinobi-gold/20 border border-shinobi-gold/60 text-shinobi-gold text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Equipado no Guerreiro</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                soundFx.playButtonClick();
                                equipItem(item.id);
                              }}
                              className="w-full py-2 bg-gradient-to-r from-shinobi-crimson to-shinobi-crimsonGlow hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-glow-crimson transition-all flex items-center justify-center gap-1.5"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>Equipar neste Slot</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 3. CATÁLOGO DE RELÍQUIAS DO MUNDO SHINOBI (A CONQUISTAR) */}
          <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-shinobi-gold" />
                  Catálogo de Relíquias ({Object.keys(allGameItems).length})
                </h3>
                <p className="text-xs text-slate-400">
                  Relíquias caem dos chefes da Arena ou são vendidas no Mercado da Vila.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(allGameItems).map((item) => {
                const isOwned = profile.inventory.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isOwned
                        ? 'bg-slate-950 border-emerald-500/40 text-slate-200'
                        : 'bg-slate-950/50 border-slate-800 opacity-60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{item.icon}</span>
                      {isOwned ? (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Desbloqueado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {item.shopPrice ? `Loja • ${item.shopPrice} Ryō` : 'Arena de Duelo'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-100">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{item.description}</div>
                    <div className="text-[10px] font-mono font-bold text-shinobi-gold mt-2">
                      Buff: +{item.buffValue}% {item.buffType.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: LOJA */}
      {activeSubTab === 'shop' && <ShopPanel />}

      {/* SUB-ABA 3: HISTÓRICO DE MISSÕES & LOGS DE XP/RYŌ */}
      {activeSubTab === 'history' && (
        <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-shinobi-gold" />
                Histórico & Logs de Missões
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Auditoria de todas as ações de conclusão, estornos e ganhos de XP e Ryō.
              </p>
            </div>

            <button
              onClick={handleRecalibrate}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all flex items-center gap-1.5 self-start sm:self-auto"
              title="Confere nível, patente, sequência e mochila sem apagar nenhum progresso"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Verificar Ficha</span>
            </button>
          </div>

          {recalibrateNotice && (
            <div className="p-3.5 bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{recalibrateNotice}</span>
            </div>
          )}

          {/* Seção dos Desafios e Ciclos */}
          <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-gold/60 p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-cinzel text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-shinobi-gold" />
                  {hasActiveChallenge && profile.activeChallenge
                    ? `${profile.activeChallenge.title || 'Desafio dos 66 Dias'} — Ciclo Atual #${profile.activeChallenge.cycleNumber || 1}`
                    : 'Desafio — Nenhum Ciclo em Andamento'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {profile.challengeHistory?.length || 0} ciclos arquivados no histórico • {hasActiveChallenge && profile.activeChallenge ? `Meta de ${profile.activeChallenge.targetDays} dias • Regra de no máximo 1 falta/semana` : 'Aguardando você iniciar um novo desafio personalizado'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveChallenge ? (
                  <button
                    onClick={openChallengeMapModal}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-shinobi-gold border border-shinobi-gold/50 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Mapa da Jornada</span>
                  </button>
                ) : (
                  <button
                    onClick={openStartChallengeModal}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all flex items-center gap-1.5 animate-pulse"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Iniciar Desafio</span>
                  </button>
                )}

                <button
                  onClick={openChallengeHistoryModal}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Área de Histórico</span>
                </button>
              </div>
            </div>
          </div>

          {/* Estatísticas da jornada */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-800 text-center text-xs shadow-md">
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Dias Cumpridos</span>
              <span className="font-bold text-shinobi-orange font-mono text-sm">{completedDays}</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Missões Concluídas</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm">{profile.missionsCompletedTotal || 0}</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Chefes Derrotados</span>
              <span className="font-bold text-rose-300 font-mono text-sm">{profile.bossesDefeated || 0} / 30</span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Recorde de Sequência</span>
              <span className="font-bold text-cyan-400 font-mono text-sm">{profile.bestStreak} dias</span>
            </div>
          </div>

          {/* Lista de Registros do Histórico */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {missionLogs.length > 0 ? (
              missionLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    log.action === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : log.action === 'reverted'
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-cyan-950/20 border-cyan-500/30'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase ${
                        log.action === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.action === 'reverted'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {log.action === 'completed' ? 'Concluída' : log.action === 'reverted' ? 'Desmarcada' : 'Sincronizado'}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {log.missionTitle}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 font-mono font-bold">
                    <span className={log.xp >= 0 ? 'text-shinobi-gold' : 'text-rose-400'}>
                      {log.xp >= 0 ? `+${log.xp}` : log.xp} XP
                    </span>
                    <span className={log.ryo >= 0 ? 'text-amber-300' : 'text-rose-400'}>
                      {log.ryo >= 0 ? `+${log.ryo}` : log.ryo} Ryō
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs bg-shinobi-bg/40 rounded-xl border border-shinobi-border/40">
                Nenhum registro no histórico de missões ainda. Marque ou desmarque missões para gerar logs em tempo real.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Dedicado de Edição de Perfil e Avatar */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Modal do Mapa dos 66 Dias */}
      <ChallengeMapModal
        isOpen={isChallengeMapModalOpen}
        onClose={closeChallengeMapModal}
      />

      {/* Modal da Área de Histórico de Desafios */}
      <ChallengeHistoryModal
        isOpen={isChallengeHistoryModalOpen}
        onClose={closeChallengeHistoryModal}
      />
    </div>
  );
};
