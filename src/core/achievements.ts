import { UserChallenge, UserProfile } from './types';
import { PillarId } from '../theme/types';
import { activeMeasures, summarizeMeasure } from './measures';

/**
 * Conquistas: marcos DERIVADOS dos fatos já guardados (dias, sequência, desafios,
 * livro-razão, medidas). Nada novo é salvo — se o progresso muda, a conquista acompanha.
 */

export type AchievementGroup = 'streak' | 'days' | 'challenges' | 'missions' | 'level' | 'pillars' | 'measures' | 'duel';

export interface Achievement {
  id: string;
  group: AchievementGroup;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
}

export const ACHIEVEMENT_GROUP_LABEL: Record<AchievementGroup, string> = {
  streak: 'Sequência',
  days: 'Dias cumpridos',
  challenges: 'Desafios',
  missions: 'Missões',
  level: 'Patente',
  pillars: 'Pilares',
  measures: 'Antes e depois',
  duel: 'Duelos',
};

export const ACHIEVEMENT_GROUP_ORDER: AchievementGroup[] = [
  'streak',
  'days',
  'challenges',
  'missions',
  'level',
  'pillars',
  'measures',
  'duel',
];

const PILLARS: PillarId[] = ['taijutsu', 'ninjutsu', 'chakra', 'espirito', 'genjutsu'];

export interface AchievementFacts {
  bestStreak: number;
  daysCompleted: number;
  challengesCompleted: number;
  longChallengeCompleted: number; // desafios principais de 66+ dias concluídos
  eliteChallengeCompleted: number;
  missionsCompleted: number;
  level: number;
  topPillarXp: number;
  lowestPillarXp: number;
  measuresTracked: number;
  measuresImproved: number;
  bossesDefeated: number;
}

/** Reúne os números em que as conquistas se baseiam. */
export function collectAchievementFacts(profile: UserProfile, challenges: UserChallenge[] = []): AchievementFacts {
  const cycles = [...(profile.challengeHistory || []), ...(profile.activeChallenge ? [profile.activeChallenge] : [])];
  const doneCycles = cycles.filter((c) => c.status === 'completed');
  const doneCustom = challenges.filter((c) => !c.isOfficial66 && c.status === 'completed').length;
  const pillarValues = PILLARS.map((p) => profile.pillarXp?.[p] || 0);
  const measures = activeMeasures(profile.measures).map(summarizeMeasure);

  return {
    bestStreak: Math.max(profile.bestStreak || 0, profile.currentStreak || 0),
    daysCompleted: Object.values(profile.dayLog || {}).filter((d) => d.completed).length,
    challengesCompleted: doneCycles.length + doneCustom,
    longChallengeCompleted: doneCycles.filter((c) => (c.targetDays || 66) >= 66).length,
    eliteChallengeCompleted: doneCycles.filter((c) => c.isEliteMode).length,
    missionsCompleted: profile.missionsCompletedTotal || 0,
    level: profile.level || 1,
    topPillarXp: Math.max(...pillarValues),
    lowestPillarXp: Math.min(...pillarValues),
    measuresTracked: measures.filter((m) => m.points.length > 0).length,
    measuresImproved: measures.filter((m) => m.improved === true).length,
    bossesDefeated: profile.bossesDefeated || 0,
  };
}

type Definition = [
  id: string,
  group: AchievementGroup,
  title: string,
  description: string,
  fact: keyof AchievementFacts,
  target: number,
];

const DEFINITIONS: Definition[] = [
  ['streak_3', 'streak', 'Faísca', '3 dias seguidos cumprindo a meta', 'bestStreak', 3],
  ['streak_7', 'streak', 'Semana inteira', '7 dias seguidos', 'bestStreak', 7],
  ['streak_14', 'streak', 'Duas semanas', '14 dias seguidos', 'bestStreak', 14],
  ['streak_21', 'streak', 'Raiz', '21 dias seguidos', 'bestStreak', 21],
  ['streak_30', 'streak', 'Mês sem falhar', '30 dias seguidos', 'bestStreak', 30],
  ['streak_66', 'streak', 'Hábito formado', '66 dias seguidos', 'bestStreak', 66],
  ['streak_100', 'streak', 'Centena', '100 dias seguidos', 'bestStreak', 100],

  ['days_10', 'days', 'Primeiros dez', '10 dias cumpridos no total', 'daysCompleted', 10],
  ['days_50', 'days', 'Cinquenta', '50 dias cumpridos no total', 'daysCompleted', 50],
  ['days_100', 'days', 'Cem dias', '100 dias cumpridos no total', 'daysCompleted', 100],
  ['days_200', 'days', 'Duzentos', '200 dias cumpridos no total', 'daysCompleted', 200],

  ['challenge_1', 'challenges', 'Primeira jornada', 'Concluir um desafio', 'challengesCompleted', 1],
  ['challenge_3', 'challenges', 'Reincidente', 'Concluir três desafios', 'challengesCompleted', 3],
  ['challenge_66', 'challenges', 'Os 66', 'Concluir um desafio principal de 66 dias ou mais', 'longChallengeCompleted', 1],
  ['challenge_elite', 'challenges', 'Sem rede', 'Concluir um desafio no Modo Elite', 'eliteChallengeCompleted', 1],

  ['missions_50', 'missions', 'Aquecimento', '50 missões concluídas', 'missionsCompleted', 50],
  ['missions_250', 'missions', 'Rotina', '250 missões concluídas', 'missionsCompleted', 250],
  ['missions_1000', 'missions', 'Mil vezes', '1.000 missões concluídas', 'missionsCompleted', 1000],

  ['level_5', 'level', 'Genin', 'Chegar ao nível 5', 'level', 5],
  ['level_12', 'level', 'Chunin', 'Chegar ao nível 12', 'level', 12],
  ['level_22', 'level', 'Jonin', 'Chegar ao nível 22', 'level', 22],

  ['pillar_500', 'pillars', 'Especialista', '500 XP em um único pilar', 'topPillarXp', 500],
  ['pillars_balanced', 'pillars', 'Equilíbrio', '100 XP em cada um dos cinco pilares', 'lowestPillarXp', 100],

  ['measure_first', 'measures', 'Ponto de partida', 'Registrar a primeira medida', 'measuresTracked', 1],
  ['measure_improved', 'measures', 'Prova de que mudou', 'Melhorar uma medida em relação ao primeiro registro', 'measuresImproved', 1],

  ['boss_1', 'duel', 'Primeira vitória', 'Derrotar um adversário', 'bossesDefeated', 1],
  ['boss_10', 'duel', 'Dez quedas', 'Derrotar dez adversários', 'bossesDefeated', 10],
];

export function evaluateAchievements(profile: UserProfile, challenges: UserChallenge[] = []): Achievement[] {
  const facts = collectAchievementFacts(profile, challenges);
  return DEFINITIONS.map(([id, group, title, description, fact, target]) => {
    const value = Math.max(0, Math.floor(facts[fact] || 0));
    return {
      id,
      group,
      title,
      description,
      current: Math.min(value, target),
      target,
      unlocked: value >= target,
    };
  });
}

/** A conquista bloqueada mais próxima de ser alcançada (para sugerir o próximo marco). */
export function nextAchievement(list: Achievement[]): Achievement | null {
  const locked = list.filter((a) => !a.unlocked);
  if (locked.length === 0) return null;
  return [...locked].sort((a, b) => b.current / b.target - a.current / a.target)[0];
}
