import React from 'react';
import { 
  CheckSquare, 
  Trophy,
  Swords, 
  User, 
  Wrench, 
  BookOpen
} from 'lucide-react';

export type TabType = 'missions' | 'challenges' | 'duel' | 'status' | 'tools' | 'cards';

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
    { id: 'challenges', label: 'Desafios', icon: Trophy },
    { id: 'duel', label: 'Duelo', icon: Swords },
    { id: 'status', label: 'Status', icon: User },
    { id: 'tools', label: '7 Ferramentas', icon: Wrench },
    { id: 'cards', label: 'Pergaminhos', icon: BookOpen },
  ];

  return (
    <div className="fixed bottom-2 sm:bottom-4 inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-40 pointer-events-none pb-safe">
      <nav className="pointer-events-auto liquid-glass-nav rounded-2xl sm:rounded-3xl relative overflow-hidden transition-all duration-300">
        {/* Filete de Brilho Especular Superior (Liquid Glass Sheen) */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 via-shinobi-gold/30 to-transparent pointer-events-none" />
        
        {/* Reflexo interno translúcido fosco */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/20 pointer-events-none" />

        <div className="grid grid-cols-6 h-16 relative z-10 px-1 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`group relative flex flex-col items-center justify-center gap-1 transition-all duration-300 touch-manipulation rounded-xl sm:rounded-2xl mx-0.5 my-0.5 ${
                  isActive
                    ? 'text-shinobi-gold font-bold bg-white/[0.14] shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/[0.22] backdrop-blur-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-all duration-300 ${
                      isActive
                        ? 'scale-110 drop-shadow-[0_0_10px_rgba(234,179,8,0.9)] text-shinobi-gold'
                        : 'group-hover:scale-105 group-hover:text-white'
                    }`}
                  />
                  {item.id === 'missions' && pendingMissionsCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-rose-600 to-shinobi-crimson text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-rose-950/80 border border-white/30 animate-pulse">
                      {pendingMissionsCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] tracking-tight transition-all duration-200 truncate px-0.5 max-w-full ${
                    isActive ? 'text-shinobi-gold font-bold' : 'font-medium'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-5 h-0.5 bg-gradient-to-r from-shinobi-gold/40 via-shinobi-gold to-shinobi-gold/40 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.9)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
