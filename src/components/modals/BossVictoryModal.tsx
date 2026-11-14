import React from 'react';
import { useDuelStore } from '../../state/useDuelStore';
import { useTheme } from '../../theme/ThemeContext';
import { Check, Backpack } from 'lucide-react';

const BUFF_LABEL: Record<string, string> = {
  xp_boost_all: 'de XP em todas as missões',
  xp_boost_pillar: 'de XP no pilar',
  extra_shield: 'Escudo de Chakra extra por semana',
  damage_boost: 'de dano na Arena',
};

export const BossVictoryModal: React.FC = () => {
  const { activeVictoryModal, claimVictoryReward } = useDuelStore();
  const { getPillar } = useTheme();

  if (!activeVictoryModal) return null;
  const { defeatedBoss, rewardItem, ryoReward, isDuplicate } = activeVictoryModal;
  const pillar = rewardItem.targetPillar ? getPillar(rewardItem.targetPillar) : null;
  const effect =
    rewardItem.buffType === 'extra_shield'
      ? `+${rewardItem.buffValue} ${BUFF_LABEL.extra_shield}`
      : `+${rewardItem.buffValue}% ${BUFF_LABEL[rewardItem.buffType]}${pillar ? ` ${pillar.name}` : ''}`;

  return (
    <div className="modal-overlay z-[110] bg-black/85 animate-in fade-in">
      <div className="bg-shinobi-card washi-texture border border-shinobi-orange w-full max-w-sm rounded-2xl overflow-hidden p-6 text-center space-y-4 relative animate-in zoom-in-95">
        <div className="absolute -top-6 -left-2 font-kanji text-[120px] leading-none text-white/[0.04] select-none pointer-events-none">勝</div>

        <div className="relative mx-auto w-24 h-24">
          <div className="w-24 h-24 rounded-full bg-slate-950 border border-shinobi-orange/70 flex items-center justify-center text-5xl grayscale opacity-80">
            {defeatedBoss.avatarEmoji || '🥷'}
          </div>
          <span className="absolute -bottom-1 -right-2 hanko-stamp animate-stamp text-2xl px-1.5 py-1 bg-slate-950/80">勝</span>
        </div>

        <div className="relative">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-shinobi-orange">
            Adversário #{defeatedBoss.number} derrotado
          </span>
          <h2 className="font-cinzel text-xl text-slate-100 mt-1">{defeatedBoss.name}</h2>
          <p className="text-xs text-slate-400 mt-1">Sua constância quebrou a guarda do oponente.</p>
        </div>

        <div className="bg-shinobi-bg p-3.5 rounded-2xl border border-shinobi-gold/50 text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{rewardItem.icon}</span>
            <div>
              <div className="text-sm font-bold text-slate-100">{rewardItem.name}</div>
              <div className="text-[10px] text-shinobi-gold font-mono uppercase">Relíquia {rewardItem.rarity}</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-300">{isDuplicate ? 'Você já tinha esta relíquia — o ferreiro da vila comprou a peça repetida e o valor foi somado ao seu Ryō.' : rewardItem.description}</p>
          <div className="flex items-center justify-between text-[11px] font-mono font-bold pt-2 border-t border-shinobi-border">
            <span className="text-emerald-300">✨ {effect}</span>
            <span className="text-amber-300">+{ryoReward} Ryō</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {!isDuplicate && (<button
            onClick={() => claimVictoryReward(true)}
            className="w-full py-3 bg-shinobi-orange text-onaccent font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Equipar Relíquia e Enfrentar o Próximo
          </button>)}
          <button
            onClick={() => claimVictoryReward(false)}
            className="w-full py-2.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <Backpack className="w-4 h-4" />
            {isDuplicate ? 'Enfrentar o Próximo' : 'Guardar na Mochila'}
          </button>
        </div>
      </div>
    </div>
  );
};
