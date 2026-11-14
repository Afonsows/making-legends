import React from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useHabitStore } from '../../state/useHabitStore';
import { useTheme } from '../../theme/ThemeContext';
import { calculateDailyXpProgress } from '../../core/streakEngine';
import { AppTab } from '../../state/useUIStore';
import { Flame, Settings2 } from 'lucide-react';

interface NavbarProps {
  activeTab: AppTab;
  onOpenStatus: () => void;
  onOpenSettings: () => void;
  isCloudSynced: boolean;
}

const TITLES: Record<AppTab, string> = {
  missions: 'Hoje',
  challenges: 'Desafios',
  status: 'Perfil',
  tools: 'Dojo',
  cards: 'Sabedoria',
};

/**
 * Cabeçalho enxuto: título da tela à esquerda; sequência, ajustes e avatar à direita.
 * Ryō, escudo, nuvem, som e lembretes saíram daqui — vivem no Perfil e nos Ajustes.
 */
export const Navbar: React.FC<NavbarProps> = ({ activeTab, onOpenStatus, onOpenSettings, isCloudSynced }) => {
  const profile = useUserStore((s) => s.profile);
  const missions = useHabitStore((s) => s.missions);
  const { getRankByLevel } = useTheme();

  const rankInfo = getRankByLevel(profile.level);
  const todayDone = calculateDailyXpProgress(missions).isUnlocked;
  const avatar =
    profile.avatarConfig.customEmoji ||
    (profile.gender === 'female' ? '🥷‍♀️' : rankInfo.badge === '🌱' ? '🥷' : rankInfo.badge);

  const eyebrow: Record<AppTab, string> = {
    missions: new Date()
      .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
      .replace(/\./g, ''),
    challenges: 'Jornadas',
    status: `Nível ${profile.level}`,
    tools: 'Ferramentas',
    cards: 'Ensinamentos',
  };

  return (
    <header className="app-header">
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="t-label truncate">{eyebrow[activeTab]}</div>
          <h1 className="t-title text-[28px] text-ink mt-1.5">{TITLES[activeTab]}</h1>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div
            className="chip !h-9 !px-3 mr-1"
            title={`Sequência: ${profile.currentStreak} dias seguidos (recorde: ${profile.bestStreak})`}
          >
            <Flame className={`w-4 h-4 ${todayDone ? 'text-accent' : 'text-ink3'}`} />
            <span className="text-sm font-bold text-ink tabular">{profile.currentStreak}</span>
          </div>

          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Ajustes">
            <Settings2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenStatus}
            aria-label={`Perfil de ${profile.name}`}
            className="relative w-10 h-10 rounded-full bg-surface2 border border-line flex items-center justify-center text-lg"
          >
            <span aria-hidden="true">{avatar}</span>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-bg ${
                isCloudSynced ? 'bg-ok' : 'bg-ink3'
              }`}
              title={isCloudSynced ? 'Sincronizado na nuvem' : 'Salvo só neste aparelho'}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
