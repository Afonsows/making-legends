import React from 'react';
import { useUserStore, ToastKind } from '../../state/useUserStore';
import { BookOpen, Check, Coins, Info, Shield, TriangleAlert, X } from 'lucide-react';

const KIND: Record<ToastKind, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  success: { icon: Check, tone: 'text-ok' },
  reward: { icon: Coins, tone: 'text-gold' },
  shield: { icon: Shield, tone: 'text-ok' },
  card: { icon: BookOpen, tone: 'text-ink' },
  info: { icon: Info, tone: 'text-ink2' },
  warning: { icon: TriangleAlert, tone: 'text-accent' },
};

/** Avisos flutuantes (sequência, Escudo de Chakra, novos pergaminhos...). */
export const ToastHost: React.FC = () => {
  const { toasts, dismissToast } = useUserStore();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-host z-[120] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
      {toasts.map((toast) => {
        const kind = KIND[toast.kind] || KIND.info;
        const Icon = kind.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto w-full max-w-md animate-in slide-in-from-bottom flex items-start gap-3 p-3.5 pr-2 rounded-2xl bg-surface border border-line shadow-pop"
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${kind.tone}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink">{toast.title}</div>
              {toast.message && <p className="text-[13px] text-ink2 mt-0.5 leading-snug">{toast.message}</p>}
            </div>
            <button onClick={() => dismissToast(toast.id)} className="icon-btn !w-8 !h-8 -mt-1" aria-label="Fechar aviso">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
