import React from 'react';
import { ListChecks, Target, User, Swords, BookOpen } from 'lucide-react';
import { AppTab } from '../../state/useUIStore';

export type TabType = AppTab;

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingMissionsCount: number;
}

const NAV_ITEMS: { id: TabType; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { id: 'missions', label: 'Hoje', icon: ListChecks },
  { id: 'challenges', label: 'Desafios', icon: Target },
  { id: 'status', label: 'Perfil', icon: User },
  { id: 'tools', label: 'Dojo', icon: Swords },
  { id: 'cards', label: 'Sabedoria', icon: BookOpen },
];

/** Barra inferior: plana, encostada na borda, com a aba ativa marcada por um traço. */
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab, pendingMissionsCount }) => (
  <nav className="bottom-nav" aria-label="Navegação principal">
    <div className="max-w-2xl mx-auto grid grid-cols-5" style={{ height: 'var(--nav-height)' }}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center gap-1 touch-manipulation transition-colors ${
              isActive ? 'text-ink' : 'text-ink3 hover:text-ink2'
            }`}
          >
            {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
            <span className="relative">
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
              {item.id === 'missions' && pendingMissionsCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-accent border-2 border-bg box-content"
                  aria-label={`${pendingMissionsCount} missões pendentes`}
                />
              )}
            </span>
            <span className={`text-[10.5px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
