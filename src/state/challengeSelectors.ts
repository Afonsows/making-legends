import { useMemo } from 'react';
import { Mission, UserChallenge } from '../core/types';
import {
  ChallengeContext,
  ChallengeStats,
  activeMissionsOn,
  challengeStats,
  isOpenState,
  looseMissions,
  makeChallengeContext,
  missionsOfChallenge,
} from '../core/challenges';
import { DailyXpProgress, calculateDailyXpProgress } from '../core/dayLog';
import { getTodayString } from '../core/dateUtils';
import { useChallengeStore } from './useChallengeStore';
import { useHabitStore } from './useHabitStore';
import { useUserStore } from './useUserStore';

/**
 * Leituras para as telas. Nada aqui é gravado: o estado de cada desafio é
 * calculado na hora a partir das marcações (ver `core/challenges.ts`).
 */

export interface ChallengeView {
  challenge: UserChallenge;
  stats: ChallengeStats;
  /** Hábitos do desafio (missões) que valem hoje. */
  habitsToday: Mission[];
  /** Todos os hábitos do desafio que ainda não foram retirados. */
  habits: Mission[];
}

export function useChallengeContext(): { ctx: ChallengeContext; today: string } {
  const challenges = useChallengeStore((s) => s.challenges);
  const missions = useHabitStore((s) => s.missions);
  const links = useUserStore((s) => s.profile.habitLinks);
  const today = getTodayString();
  const ctx = useMemo(() => makeChallengeContext(challenges, missions, links), [challenges, missions, links]);
  return { ctx, today };
}

export function buildChallengeView(challenge: UserChallenge, ctx: ChallengeContext, today: string): ChallengeView {
  const own = missionsOfChallenge(challenge.id, ctx.missions, ctx.links);
  return {
    challenge,
    stats: challengeStats(challenge, ctx, today),
    habitsToday: activeMissionsOn(own, ctx.links, ctx.index, today),
    habits: own.filter((m) => !ctx.links?.[m.id]?.until),
  };
}

/** Todos os desafios com o estado calculado: em andamento (em curso + agendados) e encerrados. */
export function useChallengeViews(): { open: ChallengeView[]; ended: ChallengeView[]; all: ChallengeView[]; today: string } {
  const { ctx, today } = useChallengeContext();
  return useMemo(() => {
    const all = Array.from(ctx.index.values()).map((c) => buildChallengeView(c, ctx, today));
    const byStart = (a: ChallengeView, b: ChallengeView) =>
      a.challenge.startDate === b.challenge.startDate
        ? a.challenge.createdAt.localeCompare(b.challenge.createdAt)
        : a.challenge.startDate.localeCompare(b.challenge.startDate);
    const open = all.filter((v) => isOpenState(v.stats.state)).sort(byStart);
    const ended = all
      .filter((v) => !isOpenState(v.stats.state))
      .sort((a, b) => b.stats.lastDate.localeCompare(a.stats.lastDate));
    return { open, ended, all, today };
  }, [ctx, today]);
}

export function useChallengeView(challengeId: string | null): ChallengeView | null {
  const { ctx, today } = useChallengeContext();
  return useMemo(() => {
    const challenge = challengeId ? ctx.index.get(challengeId) : undefined;
    return challenge ? buildChallengeView(challenge, ctx, today) : null;
  }, [ctx, today, challengeId]);
}

/** Hábitos avulsos que valem hoje. */
export function useLooseMissions(): Mission[] {
  const { ctx, today } = useChallengeContext();
  return useMemo(
    () => activeMissionsOn(looseMissions(ctx.missions, ctx.links), ctx.links, ctx.index, today),
    [ctx, today]
  );
}

/** Meta do dia (sequência): XP dos hábitos que valem hoje, em qualquer desafio ou avulsos. */
export function useTodayXp(): DailyXpProgress {
  const { ctx, today } = useChallengeContext();
  return useMemo(
    () => calculateDailyXpProgress(activeMissionsOn(ctx.missions, ctx.links, ctx.index, today), today),
    [ctx, today]
  );
}
