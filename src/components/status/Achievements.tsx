import React, { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '../../state/useUserStore';
import { useChallengeStore } from '../../state/useChallengeStore';
import { useUIStore } from '../../state/useUIStore';
import {
  Achievement,
  AchievementGroup,
  ACHIEVEMENT_GROUP_LABEL,
  ACHIEVEMENT_GROUP_ORDER,
  evaluateAchievements,
  nextAchievement,
} from '../../core/achievements';
import { Bar, SectionHeader, Sheet } from '../ui/kit';
import { Award, CalendarCheck, Check, Flag, Flame, ListChecks, Lock, Scale, Swords, TrendingUp } from 'lucide-react';

const GROUP_ICON: Record<AchievementGroup, React.ComponentType<{ className?: string }>> = {
  streak: Flame,
  days: CalendarCheck,
  challenges: Flag,
  missions: ListChecks,
  level: Award,
  pillars: Scale,
  measures: TrendingUp,
  duel: Swords,
};

const PREVIEW_COUNT = 8;

function useAchievements(): Achievement[] {
  const profile = useUserStore((s) => s.profile);
  const challenges = useChallengeStore((s) => s.challenges);
  return useMemo(() => evaluateAchievements(profile, challenges), [profile, challenges]);
}

/**
 * Anuncia conquistas novas com um aviso. Na primeira vez (ou em um aparelho novo)
 * apenas registra as que já existem, sem avisar de todas de uma vez.
 */
export function useAchievementToasts(): void {
  const list = useAchievements();
  const ready = useUserStore((s) => s.profile.hasCompletedOnboarding && s.cloudGate === 'open');
  const pushToast = useUserStore((s) => s.pushToast);
  const seen = useUIStore((s) => s.seenAchievements);
  const setSeen = useUIStore((s) => s.setSeenAchievements);
  const unlockedKey = list
    .filter((a) => a.unlocked)
    .map((a) => a.id)
    .join(',');

  useEffect(() => {
    if (!ready) return;
    const unlocked = unlockedKey ? unlockedKey.split(',') : [];
    if (seen === null) {
      setSeen(unlocked);
      return;
    }
    const fresh = unlocked.filter((id) => !seen.includes(id));
    if (fresh.length === 0) return;
    fresh.slice(0, 2).forEach((id) => {
      const achievement = list.find((a) => a.id === id);
      if (achievement) pushToast({ kind: 'success', title: 'Conquista desbloqueada', message: `${achievement.title} — ${achievement.description}.` });
    });
    setSeen([...seen, ...fresh]);
    // `list` muda junto com `unlockedKey`; a chave evita repetir o efeito a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, unlockedKey, seen]);
}

const Tile: React.FC<{ achievement: Achievement; onClick: () => void }> = ({ achievement, onClick }) => {
  const Icon = achievement.unlocked ? GROUP_ICON[achievement.group] : Lock;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${achievement.title}: ${achievement.description}`}
      aria-label={`${achievement.title}, ${achievement.unlocked ? 'desbloqueada' : `${achievement.current} de ${achievement.target}`}`}
      className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 border ${
        achievement.unlocked ? 'bg-surface2 border-gold/50 text-gold' : 'bg-surface2 border-transparent text-ink3'
      }`}
    >
      <Icon className={achievement.unlocked ? 'w-6 h-6' : 'w-4 h-4 opacity-60'} />
      {/* O número do marco distingue conquistas do mesmo grupo (3, 7, 14 dias...) */}
      {achievement.target > 1 && (
        <span className={`text-[11px] font-bold tabular leading-none ${achievement.unlocked ? 'text-ink' : 'text-ink3'}`}>
          {achievement.target.toLocaleString('pt-BR')}
        </span>
      )}
    </button>
  );
};

const Row: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const Icon = GROUP_ICON[achievement.group];
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
          achievement.unlocked ? 'border-gold/50 text-gold' : 'border-line text-ink3'
        }`}
      >
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-[15px] font-semibold ${achievement.unlocked ? 'text-ink' : 'text-ink2'}`}>{achievement.title}</div>
        <div className="text-[13px] text-ink2 leading-snug">{achievement.description}</div>
        {!achievement.unlocked && <Bar value={(achievement.current / achievement.target) * 100} className="mt-2.5" />}
      </div>
      {achievement.unlocked ? (
        <Check className="w-5 h-5 text-ok shrink-0" strokeWidth={2.5} aria-label="Desbloqueada" />
      ) : (
        <span className="text-[13px] text-ink3 tabular shrink-0">
          {achievement.current}/{achievement.target}
        </span>
      )}
    </div>
  );
};

/** Conquistas no Perfil: o próximo marco, uma grade de prévia e a lista completa em um painel. */
export const AchievementsSection: React.FC = () => {
  const list = useAchievements();
  const [isOpen, setIsOpen] = useState(false);

  const unlockedCount = list.filter((a) => a.unlocked).length;
  const next = nextAchievement(list);
  // Prévia: as desbloqueadas primeiro; depois as mais próximas de sair
  const preview = [...list]
    .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.current / b.target - a.current / a.target)
    .slice(0, PREVIEW_COUNT);

  return (
    <section>
      <SectionHeader title="Conquistas" meta={`${unlockedCount} de ${list.length}`}>
        <button type="button" onClick={() => setIsOpen(true)} className="text-[13px] font-semibold text-ink2 hover:text-ink px-1">
          Ver todas
        </button>
      </SectionHeader>

      <div className="card mt-2 p-5">
        {next && (
          <div className="pb-5 mb-5 border-b border-line">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="t-label">Próximo marco</div>
                <div className="text-[15px] font-semibold text-ink mt-2 truncate">{next.title}</div>
              </div>
              <div className="t-num text-xl text-ink shrink-0">
                {next.current}
                <span className="text-ink3 text-sm">/{next.target}</span>
              </div>
            </div>
            <Bar value={(next.current / next.target) * 100} className="mt-3" />
            <p className="text-[13px] text-ink2 mt-2.5">{next.description}</p>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2.5">
          {preview.map((achievement) => (
            <Tile key={achievement.id} achievement={achievement} onClick={() => setIsOpen(true)} />
          ))}
        </div>
      </div>

      <Sheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Conquistas"
        subtitle={`${unlockedCount} de ${list.length} desbloqueadas`}
      >
        <div className="space-y-5">
          {ACHIEVEMENT_GROUP_ORDER.map((group) => {
            const items = list.filter((a) => a.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <div className="t-label">{ACHIEVEMENT_GROUP_LABEL[group]}</div>
                <div className="divide-y divide-line">
                  {items.map((achievement) => (
                    <Row key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Sheet>
    </section>
  );
};
