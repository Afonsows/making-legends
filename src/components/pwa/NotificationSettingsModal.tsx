import React, { useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { X, Bell, Clock, Volume2, Check, Smartphone } from 'lucide-react';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIosGuide: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenIosGuide,
}) => {
  const { profile, updateNotifications } = useUserStore();

  const [morningTime, setMorningTime] = useState(profile.notificationSettings.morningTime);
  const [eveningTime, setEveningTime] = useState(profile.notificationSettings.eveningTime);
  const [enabled, setEnabled] = useState(profile.notificationSettings.enabled);
  const [soundEnabled, setSoundEnabled] = useState(profile.notificationSettings.soundEnabled);

  if (!isOpen) return null;

  const handleSave = () => {
    updateNotifications({
      morningTime,
      eveningTime,
      enabled,
      soundEnabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-shinobi-card border border-shinobi-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-shinobi-crimson" />
            <h3 className="font-cinzel text-base font-bold text-slate-100">
              Lembretes & Notificações
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Ajuste livremente seus horários de treino (ideal para turnos noturnos, escalas ou rotinas matinais).
        </p>

        {/* Configuração de Horários */}
        <div className="space-y-3">
          {/* Lembrete de Abertura / Matinal */}
          <div className="bg-shinobi-bg p-3.5 rounded-xl border border-shinobi-border flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Lembrete de Abertura do Treino
              </div>
              <div className="text-[10px] text-slate-400">
                Horário para iniciar as missões do dia
              </div>
            </div>
            <input
              type="time"
              value={morningTime}
              onChange={(e) => setMorningTime(e.target.value)}
              className="bg-shinobi-card border border-shinobi-border rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-shinobi-crimson"
            />
          </div>

          {/* Lembrete de Encerramento / Noturno */}
          <div className="bg-shinobi-bg p-3.5 rounded-xl border border-shinobi-border flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Lembrete de Fechamento do Pergaminho
              </div>
              <div className="text-[10px] text-slate-400">
                Checagem final para não quebrar a sequência
              </div>
            </div>
            <input
              type="time"
              value={eveningTime}
              onChange={(e) => setEveningTime(e.target.value)}
              className="bg-shinobi-card border border-shinobi-border rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-shinobi-crimson"
            />
          </div>

          {/* Alternadores */}
          <div className="bg-shinobi-bg p-3 rounded-xl border border-shinobi-border space-y-2">
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Ativar Notificações Push</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-shinobi-crimson w-4 h-4 rounded"
              />
            </label>
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Efeitos Sonoros do Dojo (Áudio)</span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="accent-shinobi-gold w-4 h-4 rounded"
              />
            </label>
          </div>

          {/* Atalho Guia iPhone */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenIosGuide();
            }}
            className="w-full p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-shinobi-gold" />
            <span>Está no iPhone? Veja como instalar o PWA</span>
          </button>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-shinobi-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-shinobi-crimson hover:bg-shinobi-crimsonGlow text-white font-bold text-xs rounded-xl shadow-glow-crimson transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Salvar Horários
          </button>
        </div>
      </div>
    </div>
  );
};
