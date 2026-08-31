import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { RadarChart } from './RadarChart';
import { getLevelProgress } from '../../core/xpEngine';
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
  Sliders
} from 'lucide-react';
import { allGameItems } from '../../core/itemsData';

const AVATAR_OPTIONS = [
  { emoji: '🥷', label: 'Shinobi das Sombras' },
  { emoji: '🥷‍♀️', label: 'Kunoichi Ágil' },
  { emoji: '👺', label: 'Mestre Tengu' },
  { emoji: '🥋', label: 'Lutador Taijutsu' },
  { emoji: '📜', label: 'Sábio Ninjutsu' },
  { emoji: '⚡', label: 'Raio do Trovão' },
  { emoji: '🐉', label: 'Espírito do Dragão' },
  { emoji: '🦊', label: 'Guardião Místico' },
  { emoji: '🎭', label: 'Anbu Mascarado' },
  { emoji: '👑', label: 'Kage Soberano' },
  { emoji: '🗡️', label: 'Ronin Solitário' },
  { emoji: '🌸', label: 'Lótus Noturna' },
  { emoji: '🐺', label: 'Lobo das Sombras' },
  { emoji: '🦅', label: 'Falcão Estrategista' },
  { emoji: '🔥', label: 'Chama Eterna' },
];

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
    updateProfile 
  } = useUserStore();
  const { missionLogs, recalibrateFromMissions, missions } = useHabitStore();
  const { getRankByLevel, theme } = useTheme();

  // Sub-abas do Pergaminho de Status
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'profile' | 'history'>('stats');

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
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Erro ao salvar perfil no Supabase:', err);
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
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-shinobi-card to-slate-900 border-2 border-shinobi-gold flex items-center justify-center text-4xl shadow-glow-gold/40 relative">
              <span>{avatarDisplay}</span>
              <div className="absolute -bottom-2 -right-2 bg-shinobi-crimson text-white text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-shinobi-bg">
                Nv. {currentLevel}
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('profile')}
              className="absolute -top-1 -right-1 p-1.5 bg-shinobi-card border border-shinobi-border text-slate-300 hover:text-shinobi-gold rounded-full transition-colors shadow-md"
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

            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-100">
                {profile.name}
              </h2>
              <button
                onClick={() => setActiveSubTab('profile')}
                className="text-xs text-shinobi-gold hover:underline flex items-center gap-1 font-mono"
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
      <div className="flex items-center justify-center gap-2 p-1 bg-shinobi-card/80 border border-shinobi-border rounded-2xl">
        <button
          onClick={() => setActiveSubTab('stats')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'stats'
              ? 'bg-shinobi-gold text-shinobi-bg shadow-glow-gold/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Estatísticas & Pilares</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'profile'
              ? 'bg-shinobi-gold text-shinobi-bg shadow-glow-gold/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Editar Ficha & Avatar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'history'
              ? 'bg-shinobi-gold text-shinobi-bg shadow-glow-gold/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Missões</span>
        </button>
      </div>

      {/* SUB-ABA 1: ESTATÍSTICAS E PILARES */}
      {activeSubTab === 'stats' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Grid de Estatísticas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Saldo de Ryō */}
            <div className="bg-shinobi-card p-4 rounded-xl border border-amber-500/30 text-center space-y-1 shadow-lg bg-amber-950/20">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center justify-center gap-1">
                <span>🪙</span> MOEDAS RYŌ
              </span>
              <div className="text-2xl font-cinzel font-bold text-amber-300">
                {profile.ryo || 0}
              </div>
              <p className="text-[10px] text-slate-400">
                Ganhos em missões
              </p>
            </div>

            {/* Dia do Protocolo */}
            <div className="bg-shinobi-card p-4 rounded-xl border border-shinobi-border text-center space-y-1 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                PROTOCOLO UCL
              </span>
              <div className="text-2xl font-cinzel font-bold text-shinobi-gold">
                Dia {profile.currentProtocolDay}<span className="text-xs font-mono text-slate-400">/66</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {profile.currentProtocolDay <= 22 ? 'Fase 1: Despertar' : profile.currentProtocolDay <= 44 ? 'Fase 2: Forja' : 'Fase 3: Mestria'}
              </p>
            </div>

            {/* Sequência Atual */}
            <div className="bg-shinobi-card p-4 rounded-xl border border-shinobi-border text-center space-y-1 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-shinobi-crimson" /> SEQUÊNCIA
              </span>
              <div className="text-2xl font-cinzel font-bold text-shinobi-crimson">
                {profile.currentStreak} <span className="text-xs font-mono text-slate-400">dias</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Recorde: {profile.bestStreak} dias
              </p>
            </div>

            {/* Escudos de Chakra */}
            <div className="bg-shinobi-card p-4 rounded-xl border border-shinobi-border text-center space-y-1 shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-shinobi-jade" /> ESCUDO CHAKRA
              </span>
              <div className="text-2xl font-cinzel font-bold text-shinobi-jade">
                {profile.weeklyShieldsRemaining}<span className="text-xs font-mono text-slate-400">/{profile.weeklyShieldsMax}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                1 perdão semanal ativo
              </p>
            </div>

            {/* Pergaminhos Desbloqueados */}
            <div className="bg-shinobi-card p-4 rounded-xl border border-shinobi-border text-center space-y-1 shadow-lg col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Award className="w-3 h-3 text-purple-400" /> PERGAMINHOS
              </span>
              <div className="text-2xl font-cinzel font-bold text-purple-400">
                {profile.unlockedCards.length}
              </div>
              <p className="text-[10px] text-slate-400">
                Cartas de sabedoria
              </p>
            </div>
          </div>

          {/* Radar Chart dos 5 Pilares */}
          <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-shinobi-border pb-3 mb-4">
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
                      className="p-2.5 rounded-xl bg-shinobi-bg/60 border border-shinobi-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{pillar.badgeIcon}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-200">{pillar.name}</div>
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
          <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
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
                  <div key={item.id} className="p-3 rounded-xl bg-shinobi-bg/60 border border-shinobi-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{item.name}</div>
                        <div className="text-[10px] text-shinobi-gold font-mono">{item.description}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => unequipItem(item.id)}
                      className="text-[10px] font-mono text-slate-400 hover:text-rose-400 border border-slate-700 px-2 py-1 rounded"
                    >
                      Desequipar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alternar Modo Elite (Hard Mode) */}
          <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
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
        <div className="bg-slate-950/95 border border-shinobi-gold/60 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
            <div>
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-shinobi-gold" />
                Personalização de Ficha & Avatar
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Altere seu nome de guerreiro, foto de perfil, gênero e informações de contato.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* SELETOR DE FOTO / AVATAR SHINOBI */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-shinobi-gold" /> Escolha sua Foto / Avatar Shinobi:
                </span>
                <span className="text-xs text-shinobi-gold font-mono">
                  Avatar Selecionado: {editAvatarEmoji}
                </span>
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-2.5 p-2.5 border border-shinobi-border rounded-2xl bg-shinobi-bg/80">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.emoji}
                    type="button"
                    title={opt.label}
                    onClick={() => {
                      setEditAvatarEmoji(opt.emoji);
                      if (opt.emoji === '🥷‍♀️') setEditGender('female');
                      if (opt.emoji === '🥷') setEditGender('male');
                    }}
                    className={`h-14 rounded-xl text-3xl flex items-center justify-center border transition-all ${
                      editAvatarEmoji === opt.emoji
                        ? 'border-shinobi-gold bg-shinobi-gold/25 shadow-glow-gold scale-110'
                        : 'border-shinobi-border bg-shinobi-card/60 hover:bg-shinobi-card hover:border-slate-500'
                    }`}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-shinobi-gold" /> Nome ou Codinome
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                />
              </div>

              {/* Gênero */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
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
                        : 'border-shinobi-border bg-shinobi-bg/60 text-slate-400'
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
                        : 'border-shinobi-border bg-shinobi-bg/60 text-slate-400'
                    }`}
                  >
                    <span>🥷‍♀️</span> Feminino
                  </button>
                </div>
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-shinobi-chakra" /> E-mail
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp com DDD
                </label>
                <input
                  type="tel"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-shinobi-gold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-shinobi-border">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-shinobi-gold to-amber-500 text-shinobi-bg font-bold text-xs rounded-xl shadow-glow-gold hover:opacity-95 transition-all flex items-center gap-2"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                    <span>Dados e Foto Salvos no Supabase!</span>
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
        <div className="bg-shinobi-card/95 rounded-2xl border border-shinobi-border p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-shinobi-border pb-3">
            <div>
              <h3 className="font-cinzel text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-shinobi-gold" />
                Histórico & Logs de Missões
              </h3>
              <p className="text-xs text-slate-400">
                Auditoria de todas as ações de conclusão, estornos e ganhos de XP e Ryō.
              </p>
            </div>

            <button
              onClick={handleRecalibrate}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 self-start sm:self-auto"
              title="Recalcula e zera divergências de XP com as missões reais"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sincronizar / Recalibrar Ficha</span>
            </button>
          </div>

          {recalibrateNotice && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{recalibrateNotice}</span>
            </div>
          )}

          {/* Resumo da Ficha Real */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-shinobi-bg/60 border border-shinobi-border text-center text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Missões Concluídas Hoje</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {missions.filter((m) => m.isCompletedToday).length} / {missions.length}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">XP Calculado</span>
              <span className="font-bold text-shinobi-gold font-mono text-sm">
                {missions.filter((m) => m.isCompletedToday).reduce((acc, m) => acc + m.xpReward, 0)} XP
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Ryō Calculado</span>
              <span className="font-bold text-amber-300 font-mono text-sm">
                {missions.filter((m) => m.isCompletedToday).reduce((acc, m) => acc + (m.ryoReward || 25), 0)} Ryō
              </span>
            </div>
            <div>
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
    </div>
  );
};
