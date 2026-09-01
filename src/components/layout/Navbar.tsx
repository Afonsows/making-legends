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
    <header className="sticky top-0 z-40 w-full liquid-glass-header pt-[max(env(safe-area-inset-top,0px),0.85rem)] pb-2.5 px-3.5 sm:px-4 relative transition-all duration-300">
      {/* Filete de Brilho Especular Superior (Liquid Glass Sheen) */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Lado Esquerdo: Identidade, Rank & XP */}
        <button
          onClick={onOpenStatus}
          className="flex items-center gap-2.5 text-left group hover:opacity-95 transition-opacity min-w-0"
        >
          {/* Avatar com Badge de Nível */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-shinobi-gold/70 flex items-center justify-center text-lg shadow-[0_0_12px_rgba(234,179,8,0.35)] group-hover:border-shinobi-gold transition-colors">
              {profile.avatarConfig.customEmoji || (profile.gender === 'female' ? '🥷‍♀️' : (rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge))}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-rose-600 to-shinobi-crimson text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-slate-950 shadow-md">
              {profile.level}
            </span>
          </div>

          {/* Nome, Rank e Barra de XP */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-cinzel text-xs sm:text-sm font-bold tracking-wider text-slate-100 group-hover:text-shinobi-gold transition-colors truncate max-w-[100px] sm:max-w-[160px]">
                {profile.name}
              </span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold bg-shinobi-gold/15 border border-shinobi-gold/35 text-shinobi-gold whitespace-nowrap">
                {rankInfo.name}
              </span>
            </div>

            {/* Barra de XP de Nível */}
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-20 sm:w-28 h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 shrink-0">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 whitespace-nowrap">
                {currentLevelXp}/{nextLevelXpThreshold} XP
              </span>
            </div>
          </div>
        </button>

        {/* Lado Direito: Quebra de linha — 3 Ícones da Jornada em cima & 3 Ícones Técnicos em baixo */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Linha de CIMA: 3 Ícones da Jornada (Ryō, Sequência, Escudo) */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* 1. Ryō (Moedas) */}
            <div
              title={`Saldo de Ryō: ${profile.ryo || 0} Ryō`}
              className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-950/45 border border-amber-500/40 rounded-lg sm:rounded-xl shadow-[0_0_10px_rgba(245,158,11,0.15)] whitespace-nowrap"
            >
              <span className="text-[11px] sm:text-xs">🪙</span>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300">
                {profile.ryo || 0}
              </span>
            </div>

            {/* 2. Sequência (Streak) */}
            <div 
              title={`Sequência ativa: ${profile.currentStreak} dias no protocolo`}
              className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-rose-950/45 border border-rose-500/40 rounded-lg sm:rounded-xl shadow-[0_0_10px_rgba(244,63,94,0.15)] whitespace-nowrap"
            >
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400 animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-100">
                {profile.currentStreak}
              </span>
            </div>

            {/* 3. Escudo de Chakra Semanal */}
            <div
              title={`Escudos de Chakra restantes: ${profile.weeklyShieldsRemaining}/${profile.weeklyShieldsMax}`}
              className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-mono transition-colors whitespace-nowrap ${
                profile.weeklyShieldsRemaining > 0
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/50 border-slate-700/50 text-slate-500'
              }`}
            >
              <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold">{profile.weeklyShieldsRemaining}</span>
            </div>
          </div>

          {/* Linha de BAIXO: 3 Ícones de Informações Técnicas (Nuvem, Som, Notificações) */}
          <div className="flex items-center bg-slate-950/60 rounded-lg border border-white/10 px-1 py-0.5">
            {/* 1. Nuvem Supabase / Auth */}
            <button
              onClick={onOpenAuth}
              title={isCloudSynced ? 'Sincronizado na nuvem (Supabase)' : 'Salvar progresso na nuvem'}
              className={`p-1 rounded-md transition-colors ${
                isCloudSynced
                  ? 'text-emerald-400 hover:bg-emerald-950/50'
                  : 'text-slate-400 hover:text-shinobi-gold hover:bg-white/5'
              }`}
            >
              {isCloudSynced ? (
                <CloudCheck className="w-3.5 h-3.5" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
            </button>

            {/* 2. Botão de Som */}
            <button
              onClick={toggleSound}
              title={profile.notificationSettings.soundEnabled ? 'Desativar sons' : 'Ativar sons'}
              aria-label="Alternar som"
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-md transition-colors"
            >
              {profile.notificationSettings.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-slate-300" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {/* 3. Botão de Notificações */}
            <button
              onClick={onOpenNotifications}
              title="Configurar Notificações"
              aria-label="Configurar notificações"
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-md transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
