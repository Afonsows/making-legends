import React from 'react';
import { Adversary } from '../../core/types';
import { useTheme } from '../../theme/ThemeContext';
import { WEAKNESS_BONUS_PCT } from '../../core/duelEngine';
import { Swords, Heart, ShieldAlert, Gift, CheckCircle2 } from 'lucide-react';

interface BossCardProps {
  adversary: Adversary;
  lastDamage?: { amount: number; isCritical: boolean; id: string } | null;
  isTarget?: boolean;
}

export const BossCard: React.FC<BossCardProps> = ({ adversary, lastDamage, isTarget = true }) => {
  const { getPillar } = useTheme();
  const weaknessPillar = getPillar(adversary.pillarWeakness);
  const hpPercentage = Math.max(0, Math.min(100, Math.round((adversary.currentHp / adversary.maxHp) * 100)));
  const showHit = Boolean(lastDamage && isTarget);

  const reward = adversary.rewardItem;
  const rewardEffect =
    reward.buffType === 'extra_shield'
      ? `+${reward.buffValue} escudo/semana`
      : reward.buffType === 'damage_boost'
      ? `+${reward.buffValue}% dano`
      : `+${reward.buffValue}% XP`;

  return (
    <div className="relative bg-shinobi-card washi-texture rounded-2xl border border-shinobi-border overflow-hidden ">
      <div className="h-32 bg-rose-950/50 p-4 flex items-start justify-between relative">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(60% 90% at 50% 120%, rgba(255,122,26,0.35), transparent 70%)' }} />
        <div className="flex items-center gap-2 relative">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-300 border border-rose-600/40">
            #{adversary.number} / 30
          </span>
          <span className="text-xs font-mono font-bold text-slate-300">Nv. {adversary.level}</span>
        </div>

        {adversary.isDefeated ? (
          <div className="relative flex items-center gap-1 text-xs font-mono font-bold text-shinobi-jade bg-shinobi-jade/20 px-2.5 py-1 rounded-full border border-shinobi-jade/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            DERROTADO
          </div>
        ) : (
          <div className="relative flex items-center gap-1 text-xs font-mono font-bold text-rose-300 bg-rose-950/60 px-2.5 py-1 rounded-full border border-rose-800/60">
            <Swords className="w-3.5 h-3.5" />
            EM COMBATE
          </div>
        )}
      </div>

      <div className="px-5 pb-5 -mt-16 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
          <div className="relative">
            <div
              key={showHit ? lastDamage!.id : 'idle'}
              className={`w-24 h-24 rounded-2xl bg-slate-950 border flex items-center justify-center text-5xl overflow-hidden ${
                adversary.isDefeated ? 'border-shinobi-jade/60 grayscale opacity-70' : 'border-rose-500/80 '
              } ${showHit ? 'animate-hit' : ''}`}
            >
              <span>{adversary.avatarEmoji || '🥷'}</span>
            </div>
            {adversary.isDefeated && (
              <span className="absolute -bottom-2 -right-2 hanko-stamp text-xl px-1 py-0.5 bg-slate-950/80">勝</span>
            )}
            {showHit && (
              <div
                key={`dmg_${lastDamage!.id}`}
                className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono font-black animate-float-up ${
                  lastDamage!.isCritical ? 'text-amber-300 text-lg' : 'text-rose-300 text-base'
                }`}
              >
                -{lastDamage!.amount}
                {lastDamage!.isCritical && ' 💥'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-cinzel text-lg sm:text-xl text-slate-100">{adversary.name}</h3>
            <p className="text-xs text-shinobi-orange font-medium">{adversary.title}</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3 italic bg-shinobi-bg/60 p-3 rounded-xl border border-shinobi-border/60">
          "{adversary.lore}"
        </p>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Resistência (HP)
            </span>
            <span className="font-mono font-bold text-slate-200">
              {adversary.currentHp} / {adversary.maxHp}
            </span>
          </div>
          <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                hpPercentage > 50
                  ? ' bg-rose-600 '
                  : hpPercentage > 20
                  ? ' bg-orange-600 '
                  : ' bg-amber-500 '
              }`}
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 text-right">O XP final de cada missão concluída vira dano. Desmarcar a missão devolve a vida ao adversário.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-shinobi-border">
          <div className="bg-shinobi-bg/80 border border-shinobi-border p-2.5 rounded-xl flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <div className="min-w-0 text-left">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Ponto fraco (+{WEAKNESS_BONUS_PCT}% dano)</div>
              <div className="text-xs font-bold" style={{ color: weaknessPillar.color }}>
                {weaknessPillar.badgeIcon} Missões de {weaknessPillar.name}
              </div>
            </div>
          </div>
          <div className="bg-shinobi-bg/80 border border-shinobi-border p-2.5 rounded-xl flex items-center gap-2.5">
            <Gift className="w-4 h-4 text-shinobi-gold flex-shrink-0" />
            <div className="min-w-0 text-left">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Relíquia de vitória</div>
              <div className="text-xs font-bold text-slate-200 truncate">
                {reward.icon} {reward.name} ({rewardEffect})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
