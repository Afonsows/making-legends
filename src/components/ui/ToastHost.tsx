import React from 'react';
import { useUserStore, ToastKind } from '../../state/useUserStore';
import { X } from 'lucide-react';

const KIND_STYLE: Record<ToastKind, { kanji: string; ring: string; color: string }> = {
  success: { kanji: '完', ring: 'border-shinobi-orange/70 shadow-glow-orange', color: 'text-shinobi-orange' },
  reward: { kanji: '両', ring: 'border-amber-400/70 shadow-glow-gold', color: 'text-amber-300' },
  shield: { kanji: '護', ring: 'border-emerald-400/70 shadow-glow-jade', color: 'text-emerald-300' },
  card: { kanji: '巻', ring: 'border-cyan-400/70 shadow-glow-chakra', color: 'text-cyan-300' },
  info: { kanji: '忍', ring: 'border-slate-500/70', color: 'text-slate-200' },
  warning: { kanji: '警', ring: 'border-rose-500/70 shadow-glow-crimson', color: 'text-rose-300' },
};

/** Avisos flutuantes de jogo (sequência, Escudo de Chakra, novos pergaminhos...). */
export const ToastHost: React.FC = () => {
  const { toasts, dismissToast } = useUserStore();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-host z-[120] flex flex-col items-center gap-2 px-3 pointer-events-none" aria-live="polite">
      {toasts.map((toast) => {
        const style = KIND_STYLE[toast.kind] || KIND_STYLE.info;
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto w-full max-w-md animate-in slide-in-from-bottom flex items-start gap-3 p-3 pr-2 rounded-2xl border-2 bg-slate-950/90 backdrop-blur-xl washi-texture ${style.ring}`}
          >
            <div className={`font-kanji text-2xl leading-none w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 ${style.color}`}>
              {style.kanji}
            </div>
            <div className="min-w-0 flex-1 py-0.5">
              <div className={`font-cinzel text-sm ${style.color}`}>{toast.title}</div>
              {toast.message && <p className="text-xs text-slate-300 mt-0.5 leading-snug">{toast.message}</p>}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1.5 text-slate-500 hover:text-slate-200 rounded-lg"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
