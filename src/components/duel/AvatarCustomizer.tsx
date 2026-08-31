import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { AvatarConfig } from '../../core/types';
import { X, Sparkles, Check, User } from 'lucide-react';

interface AvatarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({ isOpen, onClose }) => {
  const { profile, updateAvatar, setProfileName } = useUserStore();

  const [name, setName] = useState(profile.name);
  const [config, setConfig] = useState<AvatarConfig>(profile.avatarConfig);

  if (!isOpen) return null;

  const handleSave = () => {
    setProfileName(name);
    updateAvatar(config);
    onClose();
  };

  const silhouettes: { id: AvatarConfig['silhouette']; label: string; icon: string }[] = [
    { id: 'shadow', label: 'Sombra Silenciosa', icon: '🥷' },
    { id: 'blade', label: 'Lâmina do Vento', icon: '⚔️' },
    { id: 'sage', label: 'Ermitão do Templo', icon: '🧘' },
    { id: 'ghost', label: 'Espectro Noturno', icon: '👤' },
    { id: 'phoenix', label: 'Guardião da Chama', icon: '🦅' },
  ];

  const outfits: { id: AvatarConfig['outfit']; label: string; desc: string }[] = [
    { id: 'tunic_dark', label: 'Túnica Índigo', desc: 'Tecido leve e furtivo para treinos diários' },
    { id: 'armor_iron', label: 'Placas de Ferro', desc: 'Proteção sólida para superação física' },
    { id: 'cloak_nomad', label: 'Capa de Viagem', desc: 'Resistência ao clima e caminhadas longas' },
    { id: 'wraps_monk', label: 'Faixas Monásticas', desc: 'Foco puro na essência interior' },
  ];

  const headbands: { id: AvatarConfig['headband']; label: string; desc: string }[] = [
    { id: 'iron_slate', label: 'Placa de Ferro Neutra', desc: 'Símbolo da honra sem amarras' },
    { id: 'cloth_crimson', label: 'Faixa Carmesim', desc: 'Representa a determinação ardente' },
    { id: 'band_gold', label: 'Testeira de Ouro', desc: 'Honraria de alta consistência' },
    { id: 'mask_shadow', label: 'Máscara de Selamento', desc: 'Foco anônimo e sem distrações' },
  ];

  const auras: { id: AvatarConfig['auraColor']; label: string; color: string; bgClass: string }[] = [
    { id: 'chakra', label: 'Chakra Ciano', color: '#06b6d4', bgClass: 'bg-cyan-500' },
    { id: 'crimson', label: 'Fogo Carmesim', color: '#e11d48', bgClass: 'bg-rose-500' },
    { id: 'jade', label: 'Jade Ancestral', color: '#10b981', bgClass: 'bg-emerald-500' },
    { id: 'gold', label: 'Ouro Lendário', color: '#eab308', bgClass: 'bg-amber-500' },
    { id: 'violet', label: 'Vácuo Violeta', color: '#8b5cf6', bgClass: 'bg-purple-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-shinobi-card border border-shinobi-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-shinobi-border bg-shinobi-bg/60">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-shinobi-gold" />
            <h3 className="font-cinzel font-bold text-slate-100 text-base">
              Personalizar Identidade Shinobi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Customizador */}
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nome do Personagem */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome ou Codinome Shinobi
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-shinobi-bg border border-shinobi-border rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-shinobi-gold transition-colors"
            />
          </div>

          {/* Prévia do Avatar */}
          <div className="bg-shinobi-bg/80 border border-shinobi-border p-4 rounded-xl flex items-center justify-center gap-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-900 to-shinobi-card border-2 border-shinobi-gold flex items-center justify-center text-4xl shadow-glow-gold/40`}>
                {silhouettes.find((s) => s.id === config.silhouette)?.icon || '🥷'}
              </div>
              <div
                className="absolute -inset-1 rounded-2xl opacity-40 blur-sm pointer-events-none"
                style={{
                  backgroundColor: auras.find((a) => a.id === config.auraColor)?.color || '#06b6d4'
                }}
              />
            </div>
            <div className="text-left text-xs">
              <div className="font-bold text-slate-100">{name}</div>
              <div className="text-shinobi-gold text-[11px]">
                {outfits.find((o) => o.id === config.outfit)?.label}
              </div>
              <div className="text-slate-400 text-[10px]">
                {headbands.find((h) => h.id === config.headband)?.label}
              </div>
            </div>
          </div>

          {/* Escolha da Silhueta */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Estilo de Silhueta
            </label>
            <div className="grid grid-cols-5 gap-2">
              {silhouettes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setConfig({ ...config, silhouette: s.id })}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    config.silhouette === s.id
                      ? 'border-shinobi-gold bg-shinobi-gold/10 scale-105'
                      : 'border-shinobi-border/60 bg-shinobi-bg/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-[9px] text-slate-300 font-medium truncate w-full text-center">
                    {s.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Vestimenta */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Vestimenta de Treino
            </label>
            <div className="grid grid-cols-2 gap-2">
              {outfits.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setConfig({ ...config, outfit: o.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    config.outfit === o.id
                      ? 'border-shinobi-gold bg-shinobi-gold/10'
                      : 'border-shinobi-border/60 bg-shinobi-bg/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-100">{o.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aura de Chakra */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ressonância de Chakra (Aura)
            </label>
            <div className="flex items-center gap-2">
              {auras.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setConfig({ ...config, auraColor: a.id })}
                  className={`flex-1 py-2 px-1 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs ${
                    config.auraColor === a.id
                      ? 'border-slate-100 bg-slate-800 scale-105 font-bold'
                      : 'border-shinobi-border bg-shinobi-bg opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${a.bgClass}`} />
                  <span className="text-[10px] text-slate-200">{a.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-shinobi-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-shinobi-gold text-shinobi-bg text-xs font-bold rounded-xl shadow-glow-gold hover:bg-shinobi-goldHover transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Confirmar Avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
