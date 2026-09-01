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
    <nav className="fixed bottom-0 left-0 right-0 z-40 liquid-glass-nav pb-safe transition-all duration-300">
      {/* Filete de Brilho Especular Superior (Liquid Glass Sheen) */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-shinobi-gold/40 via-white/30 to-transparent pointer-events-none" />
      
      {/* Camada sutil de gradiente de profundidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/30 pointer-events-none" />

      <div className="max-w-md mx-auto grid grid-cols-5 h-16 relative z-10 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`group relative flex flex-col items-center justify-center gap-1 transition-all duration-300 touch-manipulation py-1 rounded-xl mx-0.5 my-1.5 ${
                isActive
                  ? 'text-shinobi-gold font-bold bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/[0.08]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-all duration-300 ${
                    isActive
                      ? 'scale-110 drop-shadow-[0_0_12px_rgba(234,179,8,0.7)] text-shinobi-gold'
                      : 'group-hover:scale-105 group-hover:text-slate-200'
                  }`}
                />
                {item.id === 'missions' && pendingMissionsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-rose-600 to-shinobi-crimson text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg shadow-rose-950/60 border border-white/20 animate-pulse">
                    {pendingMissionsCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight transition-all duration-200 ${
                  isActive ? 'text-shinobi-gold font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-5 h-0.5 bg-gradient-to-r from-shinobi-gold/40 via-shinobi-gold to-shinobi-gold/40 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
