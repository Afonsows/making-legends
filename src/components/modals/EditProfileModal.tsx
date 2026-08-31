import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { syncService } from '../../services/syncService';
import { supabase } from '../../services/supabase';
import { soundFx } from '../../utils/audio';
import { triggerLevelUpConfetti } from '../../utils/confetti';
import { 
  X, 
  Sparkles, 
  User, 
  Mail, 
  Phone, 
  Save, 
  CheckCircle2, 
  Shield, 
  Flame,
  Check
} from 'lucide-react';

export interface AvatarOption {
  emoji: string;
  label: string;
  category: 'all' | 'shinobi' | 'kunoichi' | 'mestres' | 'bestas' | 'elementos';
  tag: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // Shinobis e Guerreiros
  { emoji: '🥷', label: 'Shinobi das Sombras', category: 'shinobi', tag: 'Clássico' },
  { emoji: '👺', label: 'Mestre Tengu', category: 'shinobi', tag: 'Lendário' },
  { emoji: '🥋', label: 'Lutador Taijutsu', category: 'shinobi', tag: 'Combatente' },
  { emoji: '📜', label: 'Sábio Ninjutsu', category: 'shinobi', tag: 'Estrategista' },
  { emoji: '🗡️', label: 'Ronin Solitário', category: 'shinobi', tag: 'Espadachim' },
  { emoji: '⚔️', label: 'Mestre das Duas Lâminas', category: 'shinobi', tag: 'Combatente' },
  { emoji: '🏹', label: 'Arqueiro Oculto', category: 'shinobi', tag: 'Furtivo' },
  { emoji: '🎭', label: 'Anbu Mascarado', category: 'shinobi', tag: 'Elite' },
  { emoji: '👤', label: 'Espectro da Noite', category: 'shinobi', tag: 'Invisível' },
  
  // Kunoichis e Guerreiras
  { emoji: '🥷‍♀️', label: 'Kunoichi Ágil', category: 'kunoichi', tag: 'Clássica' },
  { emoji: '🌸', label: 'Lótus Noturna', category: 'kunoichi', tag: 'Elegância' },
  { emoji: '🌺', label: 'Dança das Pétalas', category: 'kunoichi', tag: 'Veneno & Agilidade' },
  { emoji: '🧕', label: 'Sacerdotisa do Vento', category: 'kunoichi', tag: 'Espiritual' },
  { emoji: '🦊', label: 'Espírito da Raposa', category: 'kunoichi', tag: 'Mística' },

  // Mestres & Sábios
  { emoji: '👑', label: 'Kage Soberano', category: 'mestres', tag: 'Líder Supremo' },
  { emoji: '🧘', label: 'Ermitão dos Seis Caminhos', category: 'mestres', tag: 'Ascensão' },
  { emoji: '🧓', label: 'Ancião Guardião', category: 'mestres', tag: 'Sabedoria' },
  { emoji: '👹', label: 'Demônio Guardião', category: 'mestres', tag: 'Poder Oculto' },
  { emoji: '🧙‍♂️', label: 'Alquimista de Jutsus', category: 'mestres', tag: 'Ciência Ninja' },
  { emoji: '⚡', label: 'Raikage do Trovão', category: 'mestres', tag: 'Velocidade' },

  // Bestas & Guardiões Místicos
  { emoji: '🐉', label: 'Dragão Imperial', category: 'bestas', tag: 'Divindade' },
  { emoji: '🐺', label: 'Lobo das Sombras', category: 'bestas', tag: 'Fidelidade' },
  { emoji: '🦅', label: 'Falcão Estrategista', category: 'bestas', tag: 'Visão Panorâmica' },
  { emoji: '🐅', label: 'Tigre Dourado', category: 'bestas', tag: 'Fúria Pura' },
  { emoji: '🐍', label: 'Serpente Branca', category: 'bestas', tag: 'Renascimento' },
  { emoji: '🐸', label: 'Sapo Guardião', category: 'bestas', tag: 'Invocação' },
  { emoji: '🦇', label: 'Morcego Noturno', category: 'bestas', tag: 'Radar' },

  // Elementos do Chakra
  { emoji: '🔥', label: 'Chama Eterna (Katon)', category: 'elementos', tag: 'Fogo' },
  { emoji: '🌊', label: 'Torrente Oculta (Suiton)', category: 'elementos', tag: 'Água' },
  { emoji: '🍃', label: 'Furacão da Folha (Fuuton)', category: 'elementos', tag: 'Vento' },
  { emoji: '🏔️', label: 'Rocha Inabalável (Doton)', category: 'elementos', tag: 'Terra' },
  { emoji: '👁️', label: 'Olho do Despertar (Dōjutsu)', category: 'elementos', tag: 'Visão Mental' },
  { emoji: '🌌', label: 'Cosmos & Vácuo', category: 'elementos', tag: 'Dimensão' },
  { emoji: '💎', label: 'Chakra de Diamante', category: 'elementos', tag: 'Resistência' },
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile } = useUserStore();
  const { getRankByLevel } = useTheme();

  const rankInfo = getRankByLevel(profile.level);
  const currentAvatar = profile.avatarConfig.customEmoji || (profile.gender === 'female' ? '🥷‍♀️' : (rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge));

  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email || '');
  const [editWhatsapp, setEditWhatsapp] = useState(profile.whatsapp || '');
  const [editGender, setEditGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [editAvatarEmoji, setEditAvatarEmoji] = useState(currentAvatar);
  const [activeCategory, setActiveCategory] = useState<'all' | 'shinobi' | 'kunoichi' | 'mestres' | 'bestas' | 'elementos'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditName(profile.name);
      setEditEmail(profile.email || '');
      setEditWhatsapp(profile.whatsapp || '');
      setEditGender(profile.gender || 'male');
      setEditAvatarEmoji(currentAvatar);
      setSaveSuccess(false);
    }
  }, [isOpen, profile, currentAvatar]);

  if (!isOpen) return null;

  const filteredAvatars = activeCategory === 'all' 
    ? AVATAR_OPTIONS 
    : AVATAR_OPTIONS.filter((a) => a.category === activeCategory);

  const handleSelectAvatar = (emoji: string) => {
    soundFx.playButtonClick();
    setEditAvatarEmoji(emoji);
    if (emoji === '🥷‍♀️' || emoji === '🌸' || emoji === '🌺' || emoji === '🧕') {
      setEditGender('female');
    } else if (emoji === '🥷' || emoji === '👺' || emoji === '🥋') {
      setEditGender('male');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Erro ao salvar alterações no Supabase:', err);
      soundFx.playLevelUp();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-shinobi-gold/60 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-shinobi-border bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-shinobi-gold/20 border border-shinobi-gold/40 flex items-center justify-center text-lg">
              <span>{editAvatarEmoji}</span>
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-slate-100 text-base sm:text-lg flex items-center gap-2">
                Personalização de Ficha & Avatar
              </h3>
              <p className="text-[11px] text-slate-400">
                Altere seu nome, foto de perfil, gênero e contatos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Card de Pré-visualização do Guerreiro */}
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

          <form id="profile-form" onSubmit={handleSave} className="space-y-5">
            {/* SELEÇÃO DE AVATAR COM CATEGORIAS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-shinobi-gold" /> Escolha sua Foto / Avatar Shinobi:
                </label>
                <span className="text-[11px] text-shinobi-gold font-mono">
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
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 max-h-56 overflow-y-auto">
                {filteredAvatars.map((opt) => {
                  const isSelected = editAvatarEmoji === opt.emoji;
                  return (
                    <button
                      key={opt.emoji + opt.label}
                      type="button"
                      title={opt.label}
                      onClick={() => handleSelectAvatar(opt.emoji)}
                      className={`h-14 rounded-2xl text-2xl sm:text-3xl flex flex-col items-center justify-center border transition-all relative group ${
                        isSelected
                          ? 'border-shinobi-gold bg-shinobi-gold/25 shadow-glow-gold scale-105 z-10'
                          : 'border-slate-800 bg-slate-900/90 hover:bg-slate-800 hover:border-slate-600'
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

            {/* DADOS PESSOAIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome ou Codinome */}
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
          </form>
        </div>

        {/* Footer com Ações */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="profile-form"
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
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
