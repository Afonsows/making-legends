import React from 'react';
import { 
  CheckSquare, 
  Swords, 
  User, 
  Wrench, 
  BookOpen
} from 'lucide-react';

export type TabType = 'missions' | 'duel' | 'status' | 'tools' | 'cards';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingMissionsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingMissionsCount,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'missions', label: 'Missões', icon: CheckSquare },
    { id: 'duel', label: 'Duelo', icon: Swords },
    { id: 'status', label: 'Status', icon: User },
    { id: 'tools', label: '7 Ferramentas', icon: Wrench },
    { id: 'cards', label: 'Pergaminhos', icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-shinobi-bg/95 backdrop-blur-lg border-t border-shinobi-border pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive
                  ? 'text-shinobi-gold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]' : ''}`} />
                {item.id === 'missions' && pendingMissionsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-shinobi-crimson text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingMissionsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-6 h-0.5 bg-shinobi-gold rounded-full shadow-glow-gold/80" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
