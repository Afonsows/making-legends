import { UserProfile, Mission, ProtocolChallengeCycle, DailyCheckInRecord, UserChallenge } from './types';

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
 * Valida estritamente se uma string é uma data no formato YYYY-MM-DD válida no calendário.
 */
export function isValidDateString(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
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
 * Coleta e deduplica todas as datas (YYYY-MM-DD) em que houve presença confirmada
 * em qualquer desafio (Desafio Oficial dos 66 Dias ou Desafios Personalizados).
 * 
 * Regra de negócio:
 * 1. Múltiplos desafios com presença no mesmo dia NÃO duplicam a data (Set único).
 * 2. Um dia só se torna contado quando houver presença confirmada em ao menos um desafio.
 */
export function getAllChallengePresenceDates(
  profile: UserProfile,
  customChallenges: UserChallenge[] = []
): string[] {
  const presenceSet = new Set<string>();

  // 1. Presenças no Desafio Oficial Ativo (Ciclo dos 66 Dias)
  const activeCycle = profile.activeChallenge;
  if (activeCycle && activeCycle.checkIns) {
    const cycleStartDate = activeCycle.startDate || profile.lastActiveDate || getTodayString();

    Object.entries(activeCycle.checkIns).forEach(([dayKey, record]) => {
      if (record && record.checked) {
        if (record.date && isValidDateString(record.date)) {
          presenceSet.add(record.date);
        } else if (isValidDateString(cycleStartDate)) {
          // Se a data não estava gravada diretamente no record, calcula a partir de startDate + (dayNumber - 1)
          const dayNum = Number(dayKey) || record.dayNumber || 1;
          const [y, m, d] = cycleStartDate.split('-').map(Number);
          const computedDate = new Date(y, m - 1, d + (dayNum - 1));
          const dateStr = `${computedDate.getFullYear()}-${String(computedDate.getMonth() + 1).padStart(2, '0')}-${String(computedDate.getDate()).padStart(2, '0')}`;
          if (isValidDateString(dateStr)) {
            presenceSet.add(dateStr);
          }
        }
      }
    });
  }

  // 2. Presenças nos Ciclos Históricos Arquivados do Desafio dos 66 Dias
  const history = profile.challengeHistory || [];
  history.forEach((cycle) => {
    if (cycle && cycle.checkIns) {
      const cycleStartDate = cycle.startDate;
      Object.entries(cycle.checkIns).forEach(([dayKey, record]) => {
        if (record && record.checked) {
          if (record.date && isValidDateString(record.date)) {
            presenceSet.add(record.date);
          } else if (cycleStartDate && isValidDateString(cycleStartDate)) {
            const dayNum = Number(dayKey) || record.dayNumber || 1;
            const [y, m, d] = cycleStartDate.split('-').map(Number);
            const computedDate = new Date(y, m - 1, d + (dayNum - 1));
            const dateStr = `${computedDate.getFullYear()}-${String(computedDate.getMonth() + 1).padStart(2, '0')}-${String(computedDate.getDate()).padStart(2, '0')}`;
            if (isValidDateString(dateStr)) {
              presenceSet.add(dateStr);
            }
          }
        }
      });
    }
  });

  // 3. Presenças em Desafios Personalizados Criados pelo Usuário
  customChallenges.forEach((challenge) => {
    // Ignora espelho do oficial para não duplicar com os check-ins oficiais
    if (challenge.isOfficial66 || challenge.id === 'challenge_official_66') {
      return;
    }
    (challenge.habits || []).forEach((habit) => {
      (habit.completedDates || []).forEach((dateStr) => {
        if (isValidDateString(dateStr)) {
          presenceSet.add(dateStr);
        }
      });
    });
  });

  return Array.from(presenceSet).sort();
}

/**
 * Calcula a sequência (streak) atual e o melhor recorde histórico a partir de uma lista
 * deduplicada de datas de presença em desafios.
 * 
 * Regra de contagem da sequência:
 * - Se marcou presença hoje: a ofensiva conta hoje e todos os dias consecutivos retroativos.
 * - Se não marcou presença hoje, mas marcou ontem: a ofensiva mantém o valor ativo de ontem
 *   (aguardando a marcação de presença do dia atual).
 * - Se não marcou presença hoje nem ontem: a ofensiva atual é 0.
 */
export function calculateChallengeStreak(
  presenceDates: string[] = [],
  referenceDate?: string
): { currentStreak: number; bestStreak: number } {
  if (!presenceDates || presenceDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const uniqueDates = Array.from(new Set(presenceDates)).filter(isValidDateString).sort();
  if (uniqueDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const todayStr = referenceDate && isValidDateString(referenceDate) ? referenceDate : getTodayString();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayDate = new Date(ty, tm - 1, td);

  const yesterdayDate = new Date(ty, tm - 1, td - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  // 1. Melhor sequência histórica (Recorde)
  let bestStreak = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dateStr of uniqueDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const currDate = new Date(y, m - 1, d);

    if (prevDate) {
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    } else {
      currentRun = 1;
    }

    if (currentRun > bestStreak) {
      bestStreak = currentRun;
    }
    prevDate = currDate;
  }

  // 2. Sequência atual
  let currentStreak = 0;
  let checkDate: Date | null = null;

  if (uniqueDates.includes(todayStr)) {
    checkDate = new Date(todayDate);
  } else if (uniqueDates.includes(yesterdayStr)) {
    checkDate = new Date(yesterdayDate);
  } else {
    return {
      currentStreak: 0,
      bestStreak: Math.max(bestStreak, 0),
    };
  }

  while (checkDate) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${d}`;

    if (uniqueDates.includes(dStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
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
  missions: Mission[] = [],
  customChallenges: UserChallenge[] = []
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
      if (!yesterdayRecord?.checked) {
        // Não marcou ontem, mas é a primeira falta da semana
        if (!profile.isHardModeEnabled && newShields > 0) {
          newShields -= 1;
          shieldConsumed = true;
        } else {
          streakBroken = true;
        }
      }
      currentProtocolDay = Math.min(66, currentProtocolDay + 1);
      activeCycle.currentDay = currentProtocolDay;
    } else {
      // Passaram múltiplos dias
      currentProtocolDay = Math.min(66, currentProtocolDay + daysPassed);
      activeCycle.currentDay = currentProtocolDay;
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

  // Calcula a sequência estritamente a partir das presenças confirmadas em desafios
  const updatedProfileForCalculation: UserProfile = {
    ...profile,
    activeChallenge: activeCycle,
    challengeHistory,
    currentProtocolDay,
  };
  const presenceDates = getAllChallengePresenceDates(updatedProfileForCalculation, customChallenges);
  const streakResult = calculateChallengeStreak(presenceDates, todayStr);

  const finalStreak = streakResult.currentStreak;
  const bestStreak = Math.max(profile.bestStreak || 0, streakResult.bestStreak, finalStreak);

  return {
    updatedProfile: {
      currentStreak: finalStreak,
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

