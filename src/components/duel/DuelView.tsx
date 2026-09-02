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
  ChevronRight,
  PackageOpen,
  Info
} from 'lucide-react';

interface DuelViewProps {
  onNavigateToInventory?: () => void;
}

export const DuelView: React.FC<DuelViewProps> = () => {
  const { 
    adversaries, 
    currentAdversaryIndex, 
    combatLogs, 
    lastDamageDealt,
    selectAdversary,
    getCurrentAdversary,
    isAdversaryUnlocked
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
            Cada missão concluída converte seu XP em dano físico e mental contra o oponente ativo.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsAvatarModalOpen(true)}
            className="px-3.5 py-2 bg-shinobi-card border border-shinobi-border hover:border-shinobi-gold/60 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-shinobi-gold" />
            <span>Ajustar Avatar</span>
          </button>
        </div>
      </div>

      {/* Card do Chefe Ativo */}
      <BossCard adversary={activeBoss} lastDamage={lastDamageDealt} />

      {/* Seletor dos 30 Adversários com Bloqueio Sequencial */}
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="font-cinzel text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-400" />
              Trilha dos 30 Adversários Shinobi
            </h3>
            <p className="text-[11px] text-slate-400">
              Progressão linear: derrote o oponente anterior para desbloquear o próximo.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300">
            Nível 1 ao 66
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-72 overflow-y-auto p-1">
          {adversaries.map((adv, idx) => {
            const isSelected = idx === currentAdversaryIndex;
            const isUnlocked = isAdversaryUnlocked(idx);
            const weakness = getPillar(adv.pillarWeakness);

            return (
              <button
                key={adv.id}
                disabled={!isUnlocked}
                onClick={() => isUnlocked && selectAdversary(idx)}
                title={!isUnlocked ? `Derrote o Adversário #${adv.number - 1} para desbloquear` : undefined}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-2 border-rose-500 bg-rose-950/40 shadow-glow-crimson scale-[1.02]'
                    : adv.isDefeated
                    ? 'border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-400 cursor-pointer'
                    : isUnlocked
                    ? 'border-slate-800 bg-slate-950 hover:border-slate-600 cursor-pointer'
                    : 'border-slate-900 bg-slate-950/40 opacity-40 grayscale cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    #{adv.number}
                  </span>
                  {adv.isDefeated ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : !isUnlocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <span className="text-[10px] font-mono text-rose-400 font-bold">Nv.{adv.level}</span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-100 mt-1 truncate">
                  {adv.name}
                </div>

                <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold" style={{ color: isUnlocked ? weakness.color : '#64748b' }}>
                  <span>{weakness.badgeIcon}</span>
                  <span className="truncate">{weakness.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registro de Golpes Recentes (Combat Log) */}
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl">
        <h3 className="font-cinzel text-sm sm:text-base font-bold text-slate-100 mb-3 flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <History className="w-4 h-4 text-shinobi-chakra" />
          Registro de Combate da Sessão
        </h3>

        {combatLogs.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {combatLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${
                    log.isCritical ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    -{log.damage} Dano
                  </span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-4 text-center">
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
