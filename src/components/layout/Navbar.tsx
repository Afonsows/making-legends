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
    <header className="sticky top-2 sm:top-3.5 z-40 w-full px-3 sm:px-4 pt-1.5 sm:pt-2.5 mb-4 sm:mb-6 pointer-events-none transition-all duration-300">
      <div className="pointer-events-auto max-w-4xl mx-auto liquid-glass-nav rounded-2xl sm:rounded-3xl relative overflow-hidden transition-all duration-300 p-2 sm:p-2.5 sm:px-4">
        {/* Filete de Brilho Especular Superior (Liquid Glass Sheen) */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 via-shinobi-gold/30 to-transparent pointer-events-none" />
        
        {/* Reflexo interno translúcido fosco */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-black/25 pointer-events-none" />

        {/* Brilhos sutis de ambientação nos cantos */}
        <div className="absolute -top-10 left-12 w-28 h-16 bg-shinobi-gold/[0.08] blur-xl rounded-full pointer-events-none" />
        <div className="absolute -top-10 right-12 w-28 h-16 bg-shinobi-crimson/[0.08] blur-xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4">
          {/* Lado Esquerdo: Identidade Shinobi, Rank & XP */}
          <button
            onClick={onOpenStatus}
            className="group relative flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 -m-0.5 sm:-m-1 rounded-xl sm:rounded-2xl transition-all duration-300 hover:bg-white/[0.08] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-transparent hover:border-white/15 active:scale-[0.98] min-w-0 text-left cursor-pointer"
          >
            {/* Avatar com Aura e Badge de Nível */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-shinobi-gold/70 flex items-center justify-center text-lg sm:text-xl shadow-[0_0_12px_rgba(234,179,8,0.35)] group-hover:border-shinobi-gold group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-[0_0_18px_rgba(234,179,8,0.6)] transition-all duration-300">
                {profile.avatarConfig.customEmoji || (profile.gender === 'female' ? '🥷‍♀️' : (rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge))}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-rose-600 to-shinobi-crimson text-white text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-slate-950 shadow-md group-hover:scale-110 transition-transform duration-300">
                {profile.level}
              </span>
            </div>

            {/* Nome, Rank e Barra de XP */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-cinzel text-xs sm:text-sm font-bold tracking-wider text-slate-100 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all duration-300 truncate max-w-[95px] sm:max-w-[170px]">
                  {profile.name}
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-mono font-bold bg-shinobi-gold/15 border border-shinobi-gold/35 text-shinobi-gold group-hover:bg-shinobi-gold/25 group-hover:border-shinobi-gold/60 group-hover:shadow-[0_0_10px_rgba(234,179,8,0.3)] transition-all duration-300 whitespace-nowrap">
                  {rankInfo.name}
                </span>
              </div>

              {/* Barra de XP de Nível */}
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-20 sm:w-28 h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/10 group-hover:border-white/25 shrink-0 transition-colors">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 group-hover:brightness-125 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 group-hover:text-slate-200 whitespace-nowrap transition-colors">
                  {currentLevelXp}/{nextLevelXpThreshold} XP
                </span>
              </div>
            </div>
          </button>

          {/* Lado Direito: Chips da Jornada & Controles Rápidos */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Linha Superior: 3 Chips de Status (Ryō, Sequência, Escudo) */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* 1. Ryō (Moedas) */}
              <div
                title={`Saldo de Ryō: ${profile.ryo || 0} Ryō`}
                className="group/ryo relative flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-amber-950/35 hover:bg-amber-900/50 border border-amber-500/30 hover:border-amber-400/60 shadow-[0_2px_8px_rgba(245,158,11,0.12)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 backdrop-blur-md cursor-default select-none"
              >
                <span className="text-[11px] sm:text-xs group-hover/ryo:scale-125 group-hover/ryo:rotate-12 transition-transform duration-300 inline-block drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]">
                  🪙
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300 group-hover/ryo:text-amber-200 transition-colors">
                  {profile.ryo || 0}
                </span>
              </div>

              {/* 2. Sequência (Streak) */}
              <div 
                title={`Sequência ativa: ${profile.currentStreak} dias no protocolo`}
                className="group/streak relative flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-rose-950/35 hover:bg-rose-900/50 border border-rose-500/30 hover:border-rose-400/60 shadow-[0_2px_8px_rgba(244,63,94,0.12)] hover:shadow-[0_4px_16px_rgba(244,63,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 backdrop-blur-md cursor-default select-none"
              >
                <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400 group-hover/streak:text-rose-300 group-hover/streak:scale-125 group-hover/streak:-rotate-6 transition-all duration-300 shrink-0 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse" />
                <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-100 group-hover/streak:text-white transition-colors">
                  {profile.currentStreak}
                </span>
              </div>

              {/* 3. Escudo de Chakra Semanal */}
              <div
                title={`Escudos de Chakra restantes: ${profile.weeklyShieldsRemaining}/${profile.weeklyShieldsMax}`}
                className={`group/shield relative flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-xl border backdrop-blur-md hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-default select-none ${
                  profile.weeklyShieldsRemaining > 0
                    ? 'bg-emerald-950/35 hover:bg-emerald-900/50 border-emerald-500/30 hover:border-emerald-400/60 shadow-[0_2px_8px_rgba(16,185,129,0.12)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] text-emerald-400'
                    : 'bg-slate-900/35 hover:bg-slate-800/50 border-slate-700/30 hover:border-slate-600/60 text-slate-500'
                }`}
              >
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 group-hover/shield:scale-125 group-hover/shield:rotate-6 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                <span className="text-[11px] sm:text-xs font-mono font-bold group-hover/shield:text-emerald-300 transition-colors">
                  {profile.weeklyShieldsRemaining}
                </span>
              </div>
            </div>

            {/* Linha Inferior: Micro-dock de Controles Rápidos */}
            <div className="flex items-center gap-0.5 bg-white/[0.05] hover:bg-white/[0.08] rounded-xl border border-white/10 hover:border-white/20 px-1 py-0.5 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-300">
              {/* 1. Nuvem Supabase / Auth */}
              <button
                onClick={onOpenAuth}
                title={isCloudSynced ? 'Sincronizado na nuvem (Supabase)' : 'Salvar progresso na nuvem'}
                className={`group/cloud relative p-1 rounded-lg transition-all duration-300 hover:bg-white/[0.12] hover:-translate-y-0.5 active:scale-90 ${
                  isCloudSynced
                    ? 'text-emerald-400 hover:text-emerald-300 hover:shadow-[0_2px_10px_rgba(16,185,129,0.25)]'
                    : 'text-slate-400 hover:text-shinobi-gold hover:shadow-[0_2px_10px_rgba(234,179,8,0.25)]'
                }`}
              >
                {isCloudSynced ? (
                  <CloudCheck className="w-3.5 h-3.5 group-hover/cloud:scale-115 group-hover/cloud:-rotate-6 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 group-hover/cloud:scale-115 group-hover/cloud:-rotate-6 transition-transform duration-300" />
                )}
              </button>

              {/* 2. Botão de Som */}
              <button
                onClick={toggleSound}
                title={profile.notificationSettings.soundEnabled ? 'Desativar sons' : 'Ativar sons'}
                aria-label="Alternar som"
                className="group/sound relative p-1 text-slate-400 hover:text-shinobi-gold hover:bg-white/[0.12] hover:shadow-[0_2px_10px_rgba(234,179,8,0.25)] hover:-translate-y-0.5 rounded-lg active:scale-90 transition-all duration-300"
              >
                {profile.notificationSettings.soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-slate-300 group-hover/sound:text-shinobi-gold group-hover/sound:scale-115 group-hover/sound:rotate-6 transition-all duration-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500 group-hover/sound:text-slate-300 group-hover/sound:scale-115 group-hover/sound:rotate-6 transition-all duration-300" />
                )}
              </button>

              {/* 3. Botão de Notificações */}
              <button
                onClick={onOpenNotifications}
                title="Configurar Notificações"
                aria-label="Configurar notificações"
                className="group/bell relative p-1 text-slate-400 hover:text-amber-300 hover:bg-white/[0.12] hover:shadow-[0_2px_10px_rgba(245,158,11,0.25)] hover:-translate-y-0.5 rounded-lg active:scale-90 transition-all duration-300"
              >
                <Bell className="w-3.5 h-3.5 text-slate-300 group-hover/bell:text-amber-300 group-hover/bell:scale-115 group-hover/bell:-rotate-12 transition-all duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
