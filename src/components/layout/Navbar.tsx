import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useTheme } from '../../theme/ThemeContext';
import { getLevelProgress } from '../../core/xpEngine';
import { 
  Flame, 
  Shield, 
  Volume2, 
  VolumeX, 
  Bell, 
  Cloud,
  CloudCheck,
  UserCheck
} from 'lucide-react';

interface NavbarProps {
  onOpenNotifications: () => void;
  onOpenStatus: () => void;
  onOpenAuth: () => void;
  isCloudSynced: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenNotifications, 
  onOpenStatus, 
  onOpenAuth,
  isCloudSynced,
}) => {
  const { profile, updateNotifications } = useUserStore();
  const { getRankByLevel, theme } = useTheme();

  const rankInfo = getRankByLevel(profile.level);
  const { currentLevelXp, nextLevelXpThreshold, progressPercent } = getLevelProgress(profile.totalXp);

  const toggleSound = () => {
    updateNotifications({ soundEnabled: !profile.notificationSettings.soundEnabled });
  };

  return (
    <header className="sticky top-0 z-40 w-full liquid-glass-header px-4 py-2.5 relative">
      {/* Filete de Brilho Especular Superior (Liquid Glass Sheen) */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Lado Esquerdo: Identidade & Rank */}
        <button
          onClick={onOpenStatus}
          className="flex items-center gap-2.5 text-left group hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-shinobi-card to-shinobi-scroll border-2 border-shinobi-gold/60 flex items-center justify-center text-lg shadow-glow-gold/30">
              {profile.avatarConfig.customEmoji || (profile.gender === 'female' ? '🥷‍♀️' : (rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge))}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-shinobi-crimson text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-shinobi-bg">
              {profile.level}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-cinzel text-xs font-bold tracking-wider text-slate-100 group-hover:text-shinobi-gold transition-colors">
                {profile.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-shinobi-card border border-shinobi-border text-shinobi-gold">
                {rankInfo.name}
              </span>
            </div>

            {/* Barra de XP de Nível */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-shinobi-chakra to-shinobi-jade transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {currentLevelXp}/{nextLevelXpThreshold} XP
              </span>
            </div>
          </div>
        </button>

        {/* Lado Direito: Sequência de Dias, Escudo, Ryō e Ações */}
        <div className="flex items-center gap-2">
          {/* Badge de Ryō (Moedas) */}
          <div
            title={`Saldo de Ryō: ${profile.ryo || 0} Ryō`}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/40 border border-amber-500/40 rounded-full shadow-glow-gold/20"
          >
            <span className="text-xs">🪙</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {profile.ryo || 0} <span className="text-[10px] text-amber-400 font-normal">Ryō</span>
            </span>
          </div>

          {/* Badge de Sequência (Streak) */}
          <div 
            title={`Sequência ativa: ${profile.currentStreak} dias no protocolo dos 66 dias`}
            className="flex items-center gap-1 px-2.5 py-1 bg-shinobi-card/80 border border-shinobi-crimson/40 rounded-full shadow-glow-crimson/20"
          >
            <Flame className="w-3.5 h-3.5 text-shinobi-crimson animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-100">
              {profile.currentStreak} <span className="text-[10px] text-slate-400">dias</span>
            </span>
          </div>

          {/* Escudo de Chakra Semanal */}
          <div
            title={`Escudos de Chakra restantes: ${profile.weeklyShieldsRemaining}/${profile.weeklyShieldsMax}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-mono transition-colors ${
              profile.weeklyShieldsRemaining > 0
                ? 'bg-shinobi-jade/10 border-shinobi-jade/50 text-shinobi-jade'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">{profile.weeklyShieldsRemaining}</span>
          </div>

          {/* Nuvem Supabase / Auth */}
          <button
            onClick={onOpenAuth}
            title={isCloudSynced ? 'Sincronizado na nuvem (Supabase)' : 'Salvar progresso na nuvem'}
            className={`p-1.5 rounded-lg border transition-colors ${
              isCloudSynced
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                : 'bg-shinobi-card border-shinobi-border text-slate-400 hover:text-shinobi-gold hover:border-shinobi-gold/60'
            }`}
          >
            {isCloudSynced ? (
              <CloudCheck className="w-4 h-4" />
            ) : (
              <Cloud className="w-4 h-4" />
            )}
          </button>

          {/* Botão de Som */}
          <button
            onClick={toggleSound}
            aria-label="Alternar som"
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-shinobi-card transition-colors"
          >
            {profile.notificationSettings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-slate-300" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Botão de Notificações */}
          <button
            onClick={onOpenNotifications}
            aria-label="Configurar notificações"
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-shinobi-card transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
