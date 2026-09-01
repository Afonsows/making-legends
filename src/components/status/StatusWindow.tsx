import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { RadarChart } from './RadarChart';
import { getLevelProgress } from '../../core/xpEngine';
import { getDefaultRyoReward } from '../../core/ryoEngine';
import { syncService } from '../../services/syncService';
import { supabase } from '../../services/supabase';
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
  Map
} from 'lucide-react';
import { allGameItems } from '../../core/itemsData';
import { EditProfileModal, AVATAR_OPTIONS } from '../modals/EditProfileModal';
import { ChallengeMapModal } from '../modals/ChallengeMapModal';
import { ChallengeHistoryModal } from '../modals/ChallengeHistoryModal';
import { triggerLevelUpConfetti } from '../../utils/confetti';

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
    closeChallengeHistoryModal
  } = useUserStore();
  const { missionLogs, recalibrateFromMissions, missions } = useHabitStore();
  const { getRankByLevel, theme } = useTheme();

  // Sub-abas do Pergaminho de Status
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'profile' | 'history'>('stats');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const rankInfo = getRankByLevel(profile.level);
  const { currentLevel, currentLevelXp, nextLevelXpThreshold, progressPercent } = getLevelProgress(profile.totalXp);
  const equippedList = getEquippedItems();

  const avatarDisplay = profile.avatarConfig.customEmoji || (profile.gender === 'female' ? '🥷‍♀️' : (rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge));

  // Estados de edição de perfil
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email || '');
  const [editWhatsapp, setEditWhatsapp] = useState(profile.whatsapp || '');
  const [editGender, setEditGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [editAvatarEmoji, setEditAvatarEmoji] = useState(avatarDisplay);
  const [activeCategory, setActiveCategory] = useState<'all' | 'shinobi' | 'kunoichi' | 'mestres' | 'bestas' | 'elementos'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recalibrateNotice, setRecalibrateNotice] = useState<string | null>(null);

  // Sincroniza campos quando o perfil carregar
  useEffect(() => {
    setEditName(profile.name);
    setEditEmail(profile.email || '');
    setEditWhatsapp(profile.whatsapp || '');
    setEditGender(profile.gender || 'male');
    setEditAvatarEmoji(avatarDisplay);
  }, [profile, activeSubTab]);

  const filteredAvatars = activeCategory === 'all' 
    ? AVATAR_OPTIONS 
    : AVATAR_OPTIONS.filter((a) => a.category === activeCategory);

  const handleSelectAvatarInline = (emoji: string) => {
    soundFx.playButtonClick();
    setEditAvatarEmoji(emoji);
    if (emoji === '🥷‍♀️' || emoji === '🌸' || emoji === '🌺' || emoji === '🧕') {
      setEditGender('female');
    } else if (emoji === '🥷' || emoji === '👺' || emoji === '🥋') {
      setEditGender('male');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedData = {
      name: editName.trim() || 'Aspirante Shinobi',
      email: editEmail.trim(),
      whatsapp: editWhatsapp.trim(),
      gender: editGender,
      avatarConfig: {
        ...profile.avatarConfig,
        customEmoji: editAvatarEmoji,
      },
    };

    updateProfile(updatedData);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetUserId = session?.user?.id || profile.id;

      if (targetUserId) {
        await syncService.pushUserProfile({ ...profile, ...updatedData }, targetUserId);
      }
      soundFx.playLevelUp();
      triggerLevelUpConfetti();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Erro ao salvar perfil no Supabase:', err);
      soundFx.playLevelUp();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalibrate = async () => {
    const result = recalibrateFromMissions();
    soundFx.playScrollOpen();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetUserId = session?.user?.id || profile.id;
      if (targetUserId) {
        const freshProfile = useUserStore.getState().profile;
        await syncService.pushUserProfile(freshProfile, targetUserId);
      }
    } catch (err) {
      console.warn('Recalibrado localmente.', err);
    }

    setRecalibrateNotice(`Ficha sincronizada com sucesso: ${result.totalXp} XP Total, Nível ${result.level} e ${result.ryo} Ryō.`);
    setTimeout(() => {
      setRecalibrateNotice(null);
    }, 4000);
  };

  return (
    <div className="pb-24 pt-3 max-w-4xl mx-auto px-4 space-y-4">
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
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40">
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
        </div>
      </div>

      {/* SELETOR DE SUB-ABAS (ESTATÍSTICAS / EDITAR FICHA / HISTÓRICO) */}
      <div className="flex items-center justify-center gap-2 p-2 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl">
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'stats'
              ? 'bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 shadow-glow-gold font-bold scale-[1.02]'
              : 'bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Estatísticas & Pilares</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'profile'
              ? 'bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 shadow-glow-gold font-bold scale-[1.02]'
              : 'bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Editar Ficha & Avatar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'history'
              ? 'bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 shadow-glow-gold font-bold scale-[1.02]'
              : 'bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico & Auditoria</span>
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
                Ganhos em missões
              </p>
            </div>

            {/* Dia do Protocolo */}
            <button
              type="button"
              onClick={openChallengeMapModal}
              className="bg-slate-900 border-2 border-slate-700 hover:border-shinobi-gold p-4 rounded-2xl text-center space-y-1 shadow-xl hover:scale-105 transition-all cursor-pointer group"
              title="Clique para ver o mapa completo dos 66 dias"
            >
              <span className="text-[10px] font-mono font-bold uppercase text-slate-300 group-hover:text-shinobi-gold tracking-wider flex items-center justify-center gap-1">
                <Map className="w-3 h-3 text-shinobi-gold" /> PROTOCOLO UCL
              </span>
              <div className="text-2xl font-cinzel font-bold text-shinobi-gold">
                Dia {profile.activeChallenge?.currentDay || profile.currentProtocolDay || 1}<span className="text-xs font-mono text-slate-400">/66</span>
              </div>
              <p className="text-[10px] text-slate-300 group-hover:text-slate-200">
                {profile.currentProtocolDay <= 22 ? 'Fase 1: Despertar' : profile.currentProtocolDay <= 44 ? 'Fase 2: Forja' : 'Fase 3: Mestria'}
              </p>
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
                1 perdão semanal ativo
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
              <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-shinobi-crimson" />
                Relíquias & Buffs Equipados ({equippedList.length}/3)
              </h3>
            </div>

            {equippedList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhuma relíquia equipada no momento.
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
                No Modo Elite você ganha <strong>+20% de XP em todas as missões</strong>, mas perde os escudos de perdão semanal.
              </p>
            </div>

            <button
              onClick={toggleHardMode}
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

      {/* SUB-ABA 2: EDITAR FICHA & FOTO/AVATAR */}
      {activeSubTab === 'profile' && (
        <div className="bg-slate-900/95 border border-shinobi-gold/60 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-shinobi-gold" />
                Personalização de Ficha & Avatar
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Altere seu nome de guerreiro, foto de perfil, gênero e informações de contato.
              </p>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-3 py-1.5 bg-shinobi-gold/20 border border-shinobi-gold/50 hover:bg-shinobi-gold/30 text-shinobi-gold text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Abrir em Janela Modal</span>
            </button>
          </div>

          {/* Pré-visualização da Ficha */}
          <div className="pergaminho-bg rounded-2xl border border-shinobi-gold/40 p-4 shadow-lg flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-shinobi-card to-slate-950 border-2 border-shinobi-gold flex items-center justify-center text-3xl shadow-glow-gold/50">
                <span>{editAvatarEmoji}</span>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 bg-shinobi-crimson text-white text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border border-slate-900 shadow">
                Nv. {profile.level}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-shinobi-gold/20 text-shinobi-gold border border-shinobi-gold/40">
                  {rankInfo.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {editGender === 'female' ? 'Kunoichi 🥷‍♀️' : 'Shinobi 🥷'}
                </span>
                <span className="text-[10px] text-amber-300 font-mono">
                  🪙 {profile.ryo || 0} Ryō
                </span>
              </div>
              <div className="font-cinzel text-lg font-bold text-slate-100 truncate">
                {editName || 'Aspirante Shinobi'}
              </div>
              <div className="text-[11px] text-slate-400">
                Avatar ativo: <strong className="text-shinobi-gold">{AVATAR_OPTIONS.find((a) => a.emoji === editAvatarEmoji)?.label || 'Avatar Personalizado'}</strong>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* SELETOR DE FOTO / AVATAR SHINOBI */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-shinobi-gold" /> Escolha sua Foto / Avatar Shinobi:
                </label>
                <span className="text-xs text-shinobi-gold font-mono">
                  {filteredAvatars.length} avatares disponíveis
                </span>
              </div>

              {/* Filtros de Categoria */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'shinobi', label: '🥷 Shinobis' },
                  { id: 'kunoichi', label: '🌸 Kunoichis' },
                  { id: 'mestres', label: '👑 Mestres' },
                  { id: 'bestas', label: '🐉 Bestas' },
                  { id: 'elementos', label: '🔥 Elementos' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      activeCategory === cat.id
                        ? 'bg-shinobi-gold text-slate-950 shadow-glow-gold/30 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Grid de Avatares */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 p-3 border border-slate-800 rounded-2xl bg-slate-950/90 max-h-60 overflow-y-auto">
                {filteredAvatars.map((opt) => {
                  const isSelected = editAvatarEmoji === opt.emoji;
                  return (
                    <button
                      key={opt.emoji + opt.label}
                      type="button"
                      title={opt.label}
                      onClick={() => handleSelectAvatarInline(opt.emoji)}
                      className={`h-14 rounded-xl text-3xl flex flex-col items-center justify-center border transition-all relative ${
                        isSelected
                          ? 'border-shinobi-gold bg-shinobi-gold/25 shadow-glow-gold scale-105 z-10'
                          : 'border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-shinobi-gold text-slate-950 rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-shinobi-gold" /> Nome ou Codinome Shinobi
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Afonso"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-shinobi-gold rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                />
              </div>

              {/* Gênero */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Gênero do Guerreiro
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditGender('male');
                      if (editAvatarEmoji === '🥷‍♀️') setEditAvatarEmoji('🥷');
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      editGender === 'male'
                        ? 'border-shinobi-gold bg-shinobi-gold/15 text-shinobi-gold font-bold shadow-glow-gold/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <span>🥷</span> Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditGender('female');
                      if (editAvatarEmoji === '🥷') setEditAvatarEmoji('🥷‍♀️');
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      editGender === 'female'
                        ? 'border-shinobi-gold bg-shinobi-gold/15 text-shinobi-gold font-bold shadow-glow-gold/20'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <span>🥷‍♀️</span> Feminino
                  </button>
                </div>
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-shinobi-chakra" /> E-mail
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-shinobi-gold rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp com DDD
                </label>
                <input
                  type="tel"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-shinobi-gold rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-shinobi-gold to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-glow-gold hover:opacity-95 transition-all flex items-center gap-2"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                    <span>Dados e Avatar Salvos com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar Alterações na Nuvem'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

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
              title="Recalcula e zera divergências de XP com as missões reais"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Sincronizar / Recalibrar Ficha</span>
            </button>
          </div>

          {recalibrateNotice && (
            <div className="p-3.5 bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{recalibrateNotice}</span>
            </div>
          )}

          {/* Seção dos Desafios de 66 Dias e Ciclos */}
          <div className="pergaminho-bg rounded-2xl border-2 border-shinobi-gold/60 p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-cinzel text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-shinobi-gold" />
                  Desafio dos 66 Dias — Ciclo Atual #{profile.activeChallenge?.cycleNumber || 1}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {profile.challengeHistory?.length || 0} ciclos arquivados no histórico • Regra de no máximo 1 falta/semana
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={openChallengeMapModal}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-shinobi-gold border border-shinobi-gold/50 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Mapa 66 Dias</span>
                </button>

                <button
                  onClick={openChallengeHistoryModal}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-glow-gold transition-all flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Área de Histórico</span>
                </button>
              </div>
            </div>
          </div>

          {/* Resumo da Ficha Real */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border-2 border-slate-800 text-center text-xs shadow-md">
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Missões Concluídas Hoje</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {missions.filter((m) => m.isCompletedToday).length} / {missions.length}
              </span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">XP Calculado</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm">
                {missions.filter((m) => m.isCompletedToday).reduce((acc, m) => acc + m.xpReward, 0)} XP
              </span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Ryō Calculado</span>
              <span className="font-bold text-amber-300 font-mono text-sm">
                {missions.filter((m) => m.isCompletedToday).reduce((acc, m) => acc + (m.ryoReward || getDefaultRyoReward(m.rank)), 0)} Ryō
              </span>
            </div>
            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Nível Real Correspondente</span>
              <span className="font-bold text-cyan-400 font-mono text-sm">
                Nv. {getLevelProgress(missions.filter((m) => m.isCompletedToday).reduce((acc, m) => acc + m.xpReward, 0)).currentLevel}
              </span>
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
