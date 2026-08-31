import React from 'react';
import { Adversary } from '../../core/types';
import { useTheme } from '../../theme/ThemeContext';
import { 
  Swords, 
  Heart, 
  ShieldAlert, 
  Gift, 
  Skull, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface BossCardProps {
  adversary: Adversary;
  lastDamage?: { amount: number; isCritical: boolean } | null;
}

export const BossCard: React.FC<BossCardProps> = ({ adversary, lastDamage }) => {
  const { getPillar } = useTheme();

  const weaknessPillar = getPillar(adversary.pillarWeakness);
  const hpPercentage = Math.max(0, Math.min(100, Math.round((adversary.currentHp / adversary.maxHp) * 100)));

  return (
    <div className="relative bg-shinobi-card rounded-2xl border border-shinobi-border overflow-hidden shadow-2xl">
      {/* Banner de Fundo Dinâmico */}
      <div className="h-32 bg-gradient-to-b from-rose-950/40 via-slate-900/60 to-shinobi-card p-4 flex items-start justify-between relative">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 border border-rose-600/40">
            Adversário #{adversary.number} / 30
          </span>
          <span className="text-xs font-mono font-bold text-slate-300">
            Nível {adversary.level}
          </span>
        </div>

        {adversary.isDefeated ? (
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-shinobi-jade bg-shinobi-jade/20 px-2.5 py-1 rounded-full border border-shinobi-jade/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            DOMINADO
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-800/60">
            <Swords className="w-3.5 h-3.5" />
            EM COMBATE
          </div>
        )}
      </div>

      {/* Conteúdo Principal do Boss */}
      <div className="px-5 pb-5 -mt-16 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
          {/* Silhueta / Retrato do Adversário */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-tr from-slate-900 to-rose-950 border-2 ${
              adversary.isDefeated ? 'border-shinobi-jade/60' : 'border-rose-500/80 shadow-glow-crimson'
            } flex items-center justify-center text-4xl overflow-hidden`}>
              <span className="transform hover:scale-110 transition-transform">
                {adversary.isDefeated ? '🪦' : '🥷'}
              </span>
            </div>

            {/* Float de Dano Recente */}
            {lastDamage && !adversary.isDefeated && (
              <div className="absolute -top-4 -right-2 bg-rose-600 text-white font-mono font-bold text-xs px-2 py-0.5 rounded-full shadow-glow-crimson animate-bounce">
                -{lastDamage.amount} {lastDamage.isCritical && '💥 CRÍTICO!'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100">
              {adversary.name}
            </h3>
            <p className="text-xs text-shinobi-gold font-medium">
              {adversary.title}
            </p>
          </div>
        </div>

        {/* Lore do Chefe */}
        <p className="text-xs text-slate-400 mt-3 italic bg-shinobi-bg/60 p-3 rounded-xl border border-shinobi-border/60">
          "{adversary.lore}"
        </p>

        {/* Barra de Vida (HP) do Adversário */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Barra de Resistência (HP)
            </span>
            <span className="font-mono font-bold text-slate-200">
              {adversary.currentHp} / {adversary.maxHp} ({hpPercentage}%)
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                hpPercentage > 50
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-glow-crimson'
                  : hpPercentage > 20
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              }`}
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 text-right">
            Cada ponto de XP ganho nas suas missões diárias causa dano direto a esta barra.
          </p>
        </div>

        {/* Fraqueza e Recompensa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-shinobi-border">
          {/* Fraqueza do Adversário */}
          <div className="bg-shinobi-bg/80 border border-shinobi-border p-2.5 rounded-xl flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <div className="min-w-0 text-left">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Vulnerabilidade (+35% Dano)</div>
              <div className="text-xs font-bold" style={{ color: weaknessPillar.color }}>
                {weaknessPillar.badgeIcon} Missões de {weaknessPillar.name}
              </div>
            </div>
          </div>

          {/* Recompensa Drop */}
          <div className="bg-shinobi-bg/80 border border-shinobi-border p-2.5 rounded-xl flex items-center gap-2.5">
            <Gift className="w-4 h-4 text-shinobi-gold flex-shrink-0" />
            <div className="min-w-0 text-left">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Relíquia de Vitória</div>
              <div className="text-xs font-bold text-slate-200 truncate">
                {adversary.rewardItem.icon} {adversary.rewardItem.name} (+{adversary.rewardItem.buffValue}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
