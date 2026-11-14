import React, { useEffect, useRef, useState } from 'react';
import { Check, MoreHorizontal, X } from 'lucide-react';
import { PillarId } from '../../theme/types';
import { ThemeMode, useUIStore } from '../../state/useUIStore';

/**
 * Peças básicas do sistema visual "Obsidiana".
 * Tudo aqui usa só os tokens de cor (bg, surface, ink, accent...), então
 * funciona igual no tema claro e no escuro.
 */

/** Cor do pilar como variável CSS (acompanha o tema). */
export const pillarColor = (id?: PillarId | null): string => `rgb(var(--pillar-${id || 'chakra'}))`;

/** Aplica o tema escolhido ao <html> e acompanha o aparelho quando estiver em "Sistema". */
export function useApplyTheme(): void {
  const themeMode = useUIStore((s) => s.themeMode);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const resolved: Exclude<ThemeMode, 'system'> =
        themeMode === 'system' ? (media.matches ? 'light' : 'dark') : themeMode;
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(resolved);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', resolved === 'light' ? '#161410' : '#0C0B0A');
    };
    apply();
    if (themeMode !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [themeMode]);
}

/** Anel de progresso. `value` de 0 a 1. */
export const Ring: React.FC<{
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}> = ({ value, size = 72, stroke = 6, color = 'rgb(var(--accent))', children }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(var(--surface-2))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

/** Barra de progresso fina. `value` de 0 a 100. */
export const Bar: React.FC<{ value: number; color?: string; className?: string; marker?: number }> = ({
  value,
  color,
  className = '',
  marker,
}) => (
  <div className={`relative ${className}`}>
    <div className="track">
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
    {marker !== undefined && (
      <span
        className="absolute -top-1 -bottom-1 w-px bg-ink2"
        style={{ left: `${marker}%` }}
        aria-hidden="true"
      />
    )}
  </div>
);

/** Caixa de marcação redonda, com área de toque de 44px. */
export const CheckButton: React.FC<{
  checked: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  size?: 'md' | 'sm';
}> = ({ checked, onClick, label, size = 'md' }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label}
    onClick={onClick}
    className={`shrink-0 flex items-center justify-center rounded-full touch-manipulation ${
      size === 'md' ? 'w-11 h-11 -m-1.5' : 'w-9 h-9 -m-1'
    }`}
  >
    <span
      className={`flex items-center justify-center rounded-full border transition-colors ${
        size === 'md' ? 'w-7 h-7' : 'w-6 h-6'
      } ${checked ? 'bg-ink border-ink text-bg' : 'border-ink3 text-transparent'}`}
    >
      {checked && <Check key="on" className="w-4 h-4 animate-pop" strokeWidth={3} />}
    </span>
  </button>
);

/** Seletor segmentado (uma opção ativa por vez). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex p-1 rounded-xl bg-surface2 ${className}`} role="tablist">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`flex-1 min-h-[2.25rem] px-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
              active ? 'bg-surface text-ink border border-line' : 'text-ink2 border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** Menu "⋯": guarda as ações secundárias para a tela ficar limpa. */
export const Menu: React.FC<{ items: MenuItem[]; label?: string; align?: 'right' | 'left' }> = ({
  items,
  label = 'Mais opções',
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 top-full mt-1 min-w-[13rem] p-1 rounded-xl bg-surface border border-line shadow-pop animate-in fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
                className={`w-full flex items-center gap-3 min-h-[2.75rem] px-3 rounded-lg text-sm font-medium text-left hover:bg-surface2 ${
                  item.danger ? 'text-accent' : 'text-ink'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0 opacity-80" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Cabeçalho de seção: rótulo à esquerda, ações à direita. */
export const SectionHeader: React.FC<{
  title: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, meta, children }) => (
  <div className="flex items-center justify-between gap-3 min-h-[2.5rem]">
    <div className="flex items-baseline gap-2 min-w-0">
      <h2 className="t-label !text-ink">{title}</h2>
      {meta !== undefined && <span className="text-xs text-ink3 tabular truncate">{meta}</span>}
    </div>
    {children && <div className="flex items-center gap-1 shrink-0">{children}</div>}
  </div>
);

/** Célula de indicador: número grande em cima, rótulo embaixo. */
export const Stat: React.FC<{
  value: React.ReactNode;
  label: string;
  suffix?: React.ReactNode;
  tone?: 'ink' | 'accent' | 'ok' | 'gold';
}> = ({ value, label, suffix, tone = 'ink' }) => {
  const toneClass = { ink: 'text-ink', accent: 'text-accent', ok: 'text-ok', gold: 'text-gold' }[tone];
  return (
    <div className="min-w-0">
      <div className={`t-num text-[22px] ${toneClass}`}>
        {value}
        {suffix !== undefined && <span className="text-xs font-semibold text-ink3 ml-1 font-wide">{suffix}</span>}
      </div>
      <div className="t-label mt-2 truncate">{label}</div>
    </div>
  );
};

/** Painel que sobe de baixo (no celular) ou centraliza (em telas largas). */
export const Sheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: number;
}> = ({ isOpen, onClose, title, subtitle, children, footer, zIndex = 100 }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/70 animate-in fade-in"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface border border-line rounded-t-3xl sm:rounded-2xl shadow-sheet flex flex-col animate-in slide-in-from-bottom"
        style={{ maxHeight: 'calc(100dvh - var(--safe-top) - 1.5rem)' }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="t-title text-2xl text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-ink2 mt-1.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="px-5 pt-3 border-t border-line" style={{ paddingBottom: 'max(var(--safe-bottom), 1rem)' }}>
            {footer}
          </div>
        )}
        {!footer && <div style={{ height: 'var(--safe-bottom)' }} />}
      </div>
    </div>
  );
};

/** Interruptor liga/desliga. */
export const Switch: React.FC<{ checked: boolean; onChange: (next: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-surface2 border border-line'}`}
  >
    <span
      className={`absolute top-1 w-5 h-5 rounded-full transition-all ${checked ? 'left-6 bg-bg' : 'left-1 bg-ink3'}`}
    />
  </button>
);
