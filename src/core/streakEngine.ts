import { UserProfile, Mission, ProtocolChallengeCycle, DailyCheckInRecord } from './types';

export interface ProtocolStatus {
  currentDay: number;          // 1 a 66
  phaseIndex: 1 | 2 | 3;
  phaseName: string;
  daysRemainingInPhase: number;
  totalDaysRemaining: number;
  protocolProgressPercent: number;
  streak: number;
  weeklyShieldAvailable: boolean;
  isTodayCompleted: boolean;
  isTodayCheckedIn: boolean;
  xpProgress: DailyXpProgress;
  activeChallenge: ProtocolChallengeCycle;
  missedDaysInCurrentWeek: number;
}

export interface DailyXpProgress {
  currentXp: number;
  totalTargetXp: number;
  target50PctXp: number;
  progressPercent: number;
  isUnlocked: boolean;
  remainingXpToUnlock: number;
}

/**
 * Obtém a data de hoje no formato YYYY-MM-DD no horário local.
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna a diferença em dias entre duas strings YYYY-MM-DD.
 */
export function getDaysDifference(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  const diffTime = Math.abs(b - a);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Retorna o número da semana do protocolo (1 a 10) dado o número do dia (1 a 66).
 */
export function getChallengeWeekNumber(dayNumber: number): number {
  const day = Math.min(66, Math.max(1, dayNumber));
  return Math.min(10, Math.ceil(day / 7));
}

/**
 * Retorna a faixa de dias [startDay, endDay] para determinada semana (1 a 10).
 */
export function getWeekDayRange(weekNumber: number): { startDay: number; endDay: number } {
  const week = Math.min(10, Math.max(1, weekNumber));
  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(66, week * 7);
  return { startDay, endDay };
}

/**
 * Cria um novo ciclo do desafio dos 66 dias (1/66).
 */
export function createNewChallengeCycle(
  cycleNumber: number = 1,
  startDate: string = getTodayString()
): ProtocolChallengeCycle {
  return {
    id: `cycle_${cycleNumber}_${Date.now()}`,
    cycleNumber,
    startDate,
    status: 'active',
    currentDay: 1,
    daysCompleted: 0,
    checkIns: {},
    totalXpEarned: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Calcula o progresso de XP do dia atual a partir da lista de missões.
 * Regra: O check-in só é liberado ao atingir pelo menos 50% do XP total previsto.
 */
export function calculateDailyXpProgress(missions: Mission[]): DailyXpProgress {
  if (!missions || missions.length === 0) {
    return {
      currentXp: 0,
      totalTargetXp: 100,
      target50PctXp: 50,
      progressPercent: 0,
      isUnlocked: false,
      remainingXpToUnlock: 50,
    };
  }

  const totalTargetXp = missions.reduce((acc, m) => acc + (m.xpReward || 0), 0);
  const currentXp = missions
    .filter((m) => m.isCompletedToday)
    .reduce((acc, m) => acc + (m.xpReward || 0), 0);

  const target50PctXp = Math.ceil(totalTargetXp * 0.5);
  const progressPercent = totalTargetXp > 0 ? Math.min(100, Math.round((currentXp / totalTargetXp) * 100)) : 0;
  const isUnlocked = currentXp >= target50PctXp && target50PctXp > 0;
  const remainingXpToUnlock = Math.max(0, target50PctXp - currentXp);

  return {
    currentXp,
    totalTargetXp,
    target50PctXp,
    progressPercent,
    isUnlocked,
    remainingXpToUnlock,
  };
}

/**
 * Conta o número de faltas (dias não marcados) em uma semana específica do ciclo.
 */
export function getWeekMissedDays(
  cycle: ProtocolChallengeCycle,
  weekNumber: number,
  upToDay?: number
): number {
  const { startDay, endDay } = getWeekDayRange(weekNumber);
  const limitDay = upToDay !== undefined ? upToDay : cycle.currentDay;
  let missedCount = 0;

  for (let d = startDay; d <= endDay && d < limitDay; d++) {
    const record = cycle.checkIns[d];
    if (!record || !record.checked) {
      missedCount++;
    }
  }

  return missedCount;
}

/**
 * Garante que o perfil tenha um ciclo de desafio ativo configurado.
 */
export function ensureActiveChallenge(profile: UserProfile): ProtocolChallengeCycle {
  if (profile.activeChallenge && profile.activeChallenge.status === 'active') {
    return profile.activeChallenge;
  }

  const historyLength = profile.challengeHistory?.length || 0;
  return createNewChallengeCycle(historyLength + 1, profile.lastActiveDate || getTodayString());
}

/**
 * Calcula o status detalhado do protocolo de 66 dias para o usuário.
 */
export function evaluateProtocolStatus(
  profile: UserProfile,
  missions: Mission[]
): ProtocolStatus {
  const activeCycle = ensureActiveChallenge(profile);
  const currentDay = Math.min(66, Math.max(1, activeCycle.currentDay || profile.currentProtocolDay || 1));
  
  let phaseIndex: 1 | 2 | 3 = 1;
  let phaseName = 'Despertar';
  let daysRemainingInPhase = 22 - currentDay;

  if (currentDay <= 22) {
    phaseIndex = 1;
    phaseName = 'Despertar';
    daysRemainingInPhase = 22 - currentDay;
  } else if (currentDay <= 44) {
    phaseIndex = 2;
    phaseName = 'Forja';
    daysRemainingInPhase = 44 - currentDay;
  } else {
    phaseIndex = 3;
    phaseName = 'Mestria';
    daysRemainingInPhase = 66 - currentDay;
  }

  const xpProgress = calculateDailyXpProgress(missions);
  const todayRecord = activeCycle.checkIns[currentDay];
  const isTodayCheckedIn = Boolean(todayRecord?.checked);

  const completedTodayCount = missions.filter((m) => m.isCompletedToday).length;
  const isTodayCompleted = isTodayCheckedIn || (missions.length > 0 
    ? (completedTodayCount >= Math.max(1, Math.ceil(missions.length * 0.6)))
    : false);

  const totalDaysRemaining = Math.max(0, 66 - currentDay);
  const protocolProgressPercent = Math.min(100, Math.floor((currentDay / 66) * 100));

  const currentWeek = getChallengeWeekNumber(currentDay);
  const missedDaysInCurrentWeek = getWeekMissedDays(activeCycle, currentWeek, currentDay);

  return {
    currentDay,
    phaseIndex,
    phaseName,
    daysRemainingInPhase: Math.max(0, daysRemainingInPhase),
    totalDaysRemaining,
    protocolProgressPercent,
    streak: profile.currentStreak,
    weeklyShieldAvailable: profile.weeklyShieldsRemaining > 0,
    isTodayCompleted,
    isTodayCheckedIn,
    xpProgress,
    activeChallenge: activeCycle,
    missedDaysInCurrentWeek,
  };
}

/**
 * Processa a passagem de dias e aplica a REGRA CRÍTICA:
 * - Se o usuário faltar 2 dias na mesma semana, o desafio é encerrado imediatamente,
 *   movido para o histórico de desafios e um novo ciclo 1/66 é iniciado!
 * - Caso contrário, avança normalmente os dias do protocolo.
 */
export function processDayTransition(
  profile: UserProfile,
  todayStr: string,
  missions: Mission[] = []
): {
  updatedProfile: Partial<UserProfile>;
  shieldConsumed: boolean;
  streakBroken: boolean;
  resetOccurred: boolean;
  archivedCycle?: ProtocolChallengeCycle;
} {
  const lastActive = profile.lastActiveDate;
  let activeCycle = { ...ensureActiveChallenge(profile) };
  let challengeHistory = [...(profile.challengeHistory || [])];

  // Se é o mesmo dia, não há transição
  if (lastActive === todayStr) {
    return {
      updatedProfile: {},
      shieldConsumed: false,
      streakBroken: false,
      resetOccurred: false,
    };
  }

  const daysPassed = getDaysDifference(lastActive, todayStr);
  let shieldConsumed = false;
  let streakBroken = false;
  let resetOccurred = false;
  let archivedCycle: ProtocolChallengeCycle | undefined;

  let newStreak = profile.currentStreak;
  let newShields = profile.weeklyShieldsRemaining;
  let currentProtocolDay = activeCycle.currentDay || profile.currentProtocolDay || 1;

  // Marca os dias passados que não foram checados
  const lastActiveDateObj = new Date(lastActive);
  for (let i = 0; i < daysPassed; i++) {
    const elapsedDateObj = new Date(lastActiveDateObj);
    elapsedDateObj.setDate(elapsedDateObj.getDate() + i);
    const dateStr = elapsedDateObj.toISOString().slice(0, 10);
    const dayIndex = currentProtocolDay + i;

    if (dayIndex <= 66) {
      if (!activeCycle.checkIns[dayIndex]) {
        activeCycle.checkIns[dayIndex] = {
          dayNumber: dayIndex,
          date: dateStr,
          checked: false,
          xpEarned: 0,
          targetXp: 100,
        };
      }
    }
  }

  // Verifica se alguma semana do desafio acumulou 2 faltas
  let weekWithTwoMisses: number | null = null;
  const targetDayAfterTransition = Math.min(66, currentProtocolDay + daysPassed);

  for (let w = 1; w <= 10; w++) {
    const missedInWeek = getWeekMissedDays(activeCycle, w, targetDayAfterTransition);
    if (missedInWeek >= 2) {
      weekWithTwoMisses = w;
      break;
    }
  }

  if (weekWithTwoMisses !== null) {
    // REGRA DE ENCERRAMENTO: 2 faltas na mesma semana encerram o desafio!
    resetOccurred = true;
    streakBroken = true;
    newStreak = 1;

    activeCycle.status = 'failed';
    activeCycle.endDate = todayStr;
    activeCycle.failedWeek = weekWithTwoMisses;
    activeCycle.failedReason = `2 dias sem presença na Semana ${weekWithTwoMisses}`;
    archivedCycle = { ...activeCycle };

    // Move para o histórico
    challengeHistory = [activeCycle, ...challengeHistory];

    // Inicia um novo ciclo em 1/66
    const nextCycleNumber = (activeCycle.cycleNumber || 1) + 1;
    activeCycle = createNewChallengeCycle(nextCycleNumber, todayStr);
    currentProtocolDay = 1;
  } else {
    // Nenhuma semana com 2 faltas
    if (daysPassed === 1) {
      const yesterdayRecord = activeCycle.checkIns[currentProtocolDay];
      if (yesterdayRecord?.checked) {
        newStreak += 1;
      } else {
        // Não marcou ontem, mas é a primeira falta da semana
        if (!profile.isHardModeEnabled && newShields > 0) {
          newShields -= 1;
          shieldConsumed = true;
        } else {
          newStreak = 1;
          streakBroken = true;
        }
      }
      currentProtocolDay = Math.min(66, currentProtocolDay + 1);
      activeCycle.currentDay = currentProtocolDay;
    } else {
      // Passaram múltiplos dias
      currentProtocolDay = Math.min(66, currentProtocolDay + daysPassed);
      activeCycle.currentDay = currentProtocolDay;
      newStreak = 1;
      streakBroken = true;
    }

    // Se completou o Dia 66 com sucesso!
    if (currentProtocolDay >= 66 && activeCycle.daysCompleted >= 50) {
      activeCycle.status = 'completed';
      activeCycle.endDate = todayStr;
      activeCycle.completedAt = new Date().toISOString();
      challengeHistory = [activeCycle, ...challengeHistory];
      archivedCycle = { ...activeCycle };
      activeCycle = createNewChallengeCycle((activeCycle.cycleNumber || 1) + 1, todayStr);
      currentProtocolDay = 1;
    }
  }

  const bestStreak = Math.max(profile.bestStreak, newStreak);

  return {
    updatedProfile: {
      currentStreak: newStreak,
      bestStreak,
      currentProtocolDay,
      weeklyShieldsRemaining: newShields,
      lastActiveDate: todayStr,
      activeChallenge: activeCycle,
      challengeHistory,
    },
    shieldConsumed,
    streakBroken,
    resetOccurred,
    archivedCycle,
  };
}

