import React from 'react';
import { X, Share, PlusSquare, Smartphone, Bell, Check } from 'lucide-react';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4 my-auto relative z-[101]">
        <div className="flex items-center justify-between border-b border-shinobi-border pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-shinobi-gold" />
            <h3 className="font-cinzel text-base font-bold text-slate-100">
              Instalar no iPhone (iOS Safari)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          No iOS da Apple, notificações push e funcionamento offline total são ativados quando você adiciona o app à sua tela inicial:
        </p>

        {/* Passo a Passo Visual */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-3 bg-shinobi-bg p-3 rounded-xl border border-shinobi-border">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-shinobi-gold flex-shrink-0">
              1
            </div>
            <div className="text-xs text-slate-200">
              Toque no botão <strong>Compartilhar</strong> (<Share className="w-3.5 h-3.5 inline text-sky-400" />) na barra inferior do Safari.
            </div>
          </div>

          <div className="flex items-start gap-3 bg-shinobi-bg p-3 rounded-xl border border-shinobi-border">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-shinobi-gold flex-shrink-0">
              2
            </div>
            <div className="text-xs text-slate-200">
              Role a lista para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-slate-300" />).
            </div>
          </div>

          <div className="flex items-start gap-3 bg-shinobi-bg p-3 rounded-xl border border-shinobi-border">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-shinobi-gold flex-shrink-0">
              3
            </div>
            <div className="text-xs text-slate-200">
              Toque em <strong>"Adicionar"</strong> no topo direito. O ícone do Making Legends aparecerá entre seus apps.
            </div>
          </div>
        </div>

        <div className="bg-shinobi-jade/10 border border-shinobi-jade/30 p-2.5 rounded-xl text-[11px] text-shinobi-jade flex items-center gap-2">
          <Bell className="w-4 h-4 flex-shrink-0" />
          <span>Após abrir pela tela inicial, você poderá receber os alertas das missões nos horários configurados.</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-shinobi-gold text-shinobi-bg font-bold text-xs rounded-xl shadow-glow-gold hover:bg-shinobi-goldHover transition-colors"
        >
          Entendi, vou instalar
        </button>
      </div>
    </div>
  );
};
