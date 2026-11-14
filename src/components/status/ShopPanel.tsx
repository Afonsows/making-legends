import React, { useState } from 'react';
import { useUserStore, SOLDIER_PILL_PRICE, SHIELD_SCROLL_PRICE } from '../../state/useUserStore';
import { SHOP_ITEMS } from '../../core/itemsData';
import { SOLDIER_PILL_XP_BONUS_PCT } from '../../core/xpEngine';
import { getTodayString, getWeekKey } from '../../core/dateUtils';
import { soundFx } from '../../utils/audio';
import { CheckCircle2, ShoppingBag } from 'lucide-react';

const BUFF_TEXT: Record<string, (v: number) => string> = {
  xp_boost_all: (v) => `+${v}% XP em todas as missões`,
  xp_boost_pillar: (v) => `+${v}% XP no pilar`,
  extra_shield: (v) => `+${v} Escudo de Chakra por semana`,
  damage_boost: (v) => `+${v}% de dano na Arena`,
};

/** Mercado da vila: dá uso real ao Ryō conquistado. */
export const ShopPanel: React.FC = () => {
  const { profile, buyItem, buySoldierPill, buyShieldScroll } = useUserStore();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const today = getTodayString();
  const pillActive = profile.soldierPillDates.includes(today);
  const shieldBought = profile.extraShieldWeeks.includes(getWeekKey(today));

  const handle = (result: { success: boolean; reason?: string }, successText: string) => {
    if (result.success) {
      setFeedback({ ok: true, text: successText });
    } else {
      soundFx.playError();
      setFeedback({ ok: false, text: result.reason || 'Não foi possível comprar.' });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  const consumables = [
    {
      id: 'pill',
      icon: '💊',
      kanji: '兵',
      name: 'Pílula de Soldado',
      desc: `+${SOLDIER_PILL_XP_BONUS_PCT}% de XP em tudo que você concluir hoje. Ideal para dias de treino pesado.`,
      price: SOLDIER_PILL_PRICE,
      disabled: pillActive,
      status: pillActive ? 'Ativa hoje' : 'Vale até 23:59',
      onBuy: () => handle(buySoldierPill(), 'Pílula de Soldado ativada! Seu XP está ampliado até o fim do dia.'),
    },
    {
      id: 'shield',
      icon: '📜',
      kanji: '護',
      name: 'Pergaminho de Proteção',
      desc: 'Reforça o Escudo de Chakra: +1 falta protegida nesta semana para a sua sequência.',
      price: SHIELD_SCROLL_PRICE,
      disabled: shieldBought || profile.isHardModeEnabled,
      status: profile.isHardModeEnabled ? 'Indisponível no Modo Elite' : shieldBought ? 'Já usado nesta semana' : '1 por semana',
      onBuy: () => handle(buyShieldScroll(), 'Escudo reforçado! Você tem mais uma proteção nesta semana.'),
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="pergaminho-bg rounded-2xl border border-shinobi-orange/40 p-5 relative overflow-hidden">
        <div className="absolute -top-6 right-2 font-kanji text-[110px] leading-none text-white/[0.04] select-none pointer-events-none">店</div>
        <div className="flex items-center justify-between gap-3 relative">
          <div>
            <h2 className="font-cinzel text-lg sm:text-xl text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-shinobi-orange" />
              Mercado da Vila
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Troque o Ryō das suas missões por vantagens reais.</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Sua bolsa</div>
            <div className="font-mono font-bold text-lg text-amber-300">🪙 {profile.ryo}</div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs border animate-in fade-in ${
            feedback.ok ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-cinzel text-sm text-slate-200">Suprimentos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {consumables.map((c) => {
            const affordable = profile.ryo >= c.price;
            return (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute -right-2 -bottom-4 font-kanji text-7xl text-white/[0.04] pointer-events-none">{c.kanji}</div>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{c.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-100">{c.name}</div>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{c.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="text-[10px] font-mono text-slate-500">{c.status}</span>
                  <button
                    onClick={c.onBuy}
                    disabled={c.disabled}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                      c.disabled
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : affordable
                        ? ' bg-amber-500 text-slate-950 '
                        : 'bg-slate-800 text-amber-300/70 border border-amber-500/30'
                    }`}
                  >
                    🪙 {c.price}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-cinzel text-sm text-slate-200">Equipamentos do Ferreiro</h3>
        <p className="text-[11px] text-slate-500">Itens permanentes: depois de comprados, ficam na sua mochila para equipar (1 por tipo).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHOP_ITEMS.map((item) => {
            const owned = profile.inventory.includes(item.id);
            const price = item.shopPrice || 0;
            const affordable = profile.ryo >= price;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex flex-col gap-3 ${owned ? 'bg-emerald-950/15 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-100">{item.name}</div>
                    <div className="text-[10px] font-mono text-shinobi-orange uppercase">
                      {item.type === 'gear' ? 'Equipamento' : item.type === 'relic' ? 'Relíquia' : item.type === 'scroll' ? 'Pergaminho' : 'Elixir'} •{' '}
                      {item.rarity}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug mt-1">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="text-[11px] font-mono font-bold text-emerald-300">{BUFF_TEXT[item.buffType]?.(item.buffValue)}</span>
                  {owned ? (
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Na mochila
                    </span>
                  ) : (
                    <button
                      onClick={() => handle(buyItem(item.id), `${item.name} adicionado à mochila! Equipe na aba Mochila.`)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                        affordable
                          ? ' bg-amber-500 text-slate-950 '
                          : 'bg-slate-800 text-amber-300/70 border border-amber-500/30'
                      }`}
                    >
                      🪙 {price}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
