import React, { useState } from 'react';
import { useDuelStore } from '../../state/useDuelStore';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { BossCard } from './BossCard';
import { AvatarCustomizer } from './AvatarCustomizer';
import { 
  Swords, 
  ShieldAlert, 
  History, 
  Award, 
  Lock, 
  CheckCircle2, 
  User, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const DuelView: React.FC = () => {
  const { 
    adversaries, 
    currentAdversaryIndex, 
    combatLogs, 
    lastDamageDealt,
    selectAdversary,
    getCurrentAdversary 
  } = useDuelStore();

  const { profile } = useUserStore();
  const { theme, getPillar } = useTheme();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const activeBoss = getCurrentAdversary();

  const defeatedCount = adversaries.filter((a) => a.isDefeated).length;

  return (
    <div className="pb-24 pt-3 max-w-4xl mx-auto px-4 space-y-4">
      {/* Header do Modo Duelo */}
      <div className="pergaminho-bg rounded-2xl border border-shinobi-border p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 font-bold border border-rose-600/40">
              Arena de Duelo Shinobi
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {defeatedCount} / 30 Adversários Derrotados
            </span>
          </div>

          <h2 className="font-cinzel text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Duelo de Treinamento Diário</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cada missão concluída converte seu XP em dano físico e mental contra o oponente.
          </p>
        </div>

        <button
          onClick={() => setIsAvatarModalOpen(true)}
          className="px-3.5 py-2 bg-shinobi-card border border-shinobi-border hover:border-shinobi-gold/60 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          <User className="w-3.5 h-3.5 text-shinobi-gold" />
          <span>Ajustar Avatar</span>
        </button>
      </div>

      {/* Card do Chefe Ativo */}
      <BossCard adversary={activeBoss} lastDamage={lastDamageDealt} />

      {/* Seletor dos 30 Adversários */}
      <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-cinzel text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-rose-400" />
            Trilha dos 30 Adversários Shinobi
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Nível 1 ao 66
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
          {adversaries.map((adv, idx) => {
            const isSelected = idx === currentAdversaryIndex;
            const weakness = getPillar(adv.pillarWeakness);

            return (
              <button
                key={adv.id}
                onClick={() => selectAdversary(idx)}
                className={`p-2.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-rose-500 bg-rose-950/20 shadow-glow-crimson'
                    : adv.isDefeated
                    ? 'border-shinobi-jade/40 bg-shinobi-bg/60 opacity-80'
                    : 'border-shinobi-border bg-shinobi-bg/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    #{adv.number}
                  </span>
                  {adv.isDefeated ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-shinobi-jade" />
                  ) : (
                    <span className="text-[10px] font-mono text-rose-400">Nv.{adv.level}</span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-200 mt-1 truncate">
                  {adv.name}
                </div>

                <div className="flex items-center gap-1 mt-1 text-[9px]" style={{ color: weakness.color }}>
                  <span>{weakness.badgeIcon}</span>
                  <span className="truncate">{weakness.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registro de Golpes Recentes (Combat Log) */}
      <div className="bg-shinobi-card rounded-2xl border border-shinobi-border p-4 shadow-lg">
        <h3 className="font-cinzel text-sm font-bold text-slate-200 mb-2 flex items-center gap-1.5">
          <History className="w-4 h-4 text-shinobi-chakra" />
          Registro de Combate da Sessão
        </h3>

        {combatLogs.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {combatLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 rounded-lg bg-shinobi-bg/70 border border-shinobi-border text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${
                    log.isCritical ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    -{log.damage} Dano
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            Marque missões na aba "Missões" para deferir golpes contra o oponente!
          </p>
        )}
      </div>

      {/* Modal de Customização de Avatar */}
      <AvatarCustomizer
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </div>
  );
};
