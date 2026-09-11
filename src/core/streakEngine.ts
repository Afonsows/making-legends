import { UserProfile, Mission, ProtocolChallengeCycle, DailyCheckInRecord, UserChallenge } from './types';

export interface ProtocolStatus {
  hasActiveChallenge: boolean;
  currentDay: number;          // 1 a 66 (ou 0 se sem desafio)
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
  activeChallenge?: ProtocolChallengeCycle;
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
 * Retorna a diferença em dias entre duas strings YYYY-MM-DD usando calendário local (sem distorção de timezone).
 */
export function getDaysDifference(dateA: string, dateB: string): number {
  if (!isValidDateString(dateA) || !isValidDateString(dateB)) return 0;
  const [yA, mA, dA] = (dateA as string).split('-').map(Number);
  const [yB, mB, dB] = (dateB as string).split('-').map(Number);
  const a = new Date(yA, mA - 1, dA).getTime();
  const b = new Date(yB, mB - 1, dB).getTime();
  const diffTime = Math.abs(b - a);
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Adiciona ou subtrai dias de uma string YYYY-MM-DD usando calendário local.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  if (!isValidDateString(dateStr)) return getTodayString();
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

/**
 * Formata data YYYY-MM-DD para o padrão brasileiro DD/MM/YYYY sem sofrer com offset de UTC/fuso horário.
 */
export function formatDateBR(dateStr?: string): string {
  if (!dateStr || !isValidDateString(dateStr)) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
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
 * Gera uma sugestão configurável para o próximo ciclo de desafio.
 */
export function suggestNextChallengeCycle(
  profile: UserProfile,
  targetDays: number = 66
): {
  suggestedCycleNumber: number;
  suggestedTitle: string;
  targetDays: number;
  startDate: string;
} {
  const history = profile.challengeHistory || [];
  const nextNumber = history.length + 1;
  return {
    suggestedCycleNumber: nextNumber,
    suggestedTitle: `Desafio ${targetDays} Dias — Ciclo #${nextNumber}`,
    targetDays,
    startDate: getTodayString(),
  };
}

/**
 * Retorna o ciclo ativo de desafio se existir e estiver ativo, ou undefined.
 */
export function ensureActiveChallenge(profile: UserProfile): ProtocolChallengeCycle | undefined {
  if (profile.activeChallenge && profile.activeChallenge.status === 'active') {
    return profile.activeChallenge;
  }
  return undefined;
}

/**
 * Calcula o status detalhado do protocolo para o usuário.
 * Se o usuário não tiver um desafio ativo iniciado, retorna hasActiveChallenge: false.
 */
export function evaluateProtocolStatus(
  profile: UserProfile,
  missions: Mission[] = []
): ProtocolStatus {
  const hasActiveChallenge = Boolean(profile.activeChallenge && profile.activeChallenge.status === 'active');
  const xpProgress = calculateDailyXpProgress(missions);

  if (!hasActiveChallenge || !profile.activeChallenge) {
    const completedTodayCount = (missions || []).filter((m) => m.isCompletedToday).length;
    const isTodayCompleted = (missions || []).length > 0 
      ? (completedTodayCount >= Math.max(1, Math.ceil((missions || []).length * 0.6)))
      : false;

    return {
      hasActiveChallenge: false,
      currentDay: 0,
      phaseIndex: 1,
      phaseName: 'Aguardando Desafio',
      daysRemainingInPhase: 0,
      totalDaysRemaining: 0,
      protocolProgressPercent: 0,
      streak: profile.currentStreak,
      weeklyShieldAvailable: profile.weeklyShieldsRemaining > 0,
      isTodayCompleted,
      isTodayCheckedIn: false,
      xpProgress,
      activeChallenge: undefined,
      missedDaysInCurrentWeek: 0,
    };
  }

  const activeCycle = profile.activeChallenge;
  const targetDays = activeCycle.targetDays || 66;
  const currentDay = Math.min(targetDays, Math.max(1, activeCycle.currentDay || profile.currentProtocolDay || 1));
  
  const p1 = Math.max(1, Math.floor(targetDays / 3));
  const p2 = Math.max(p1 + 1, Math.floor((targetDays * 2) / 3));

  let phaseIndex: 1 | 2 | 3 = 1;
  let phaseName = 'Despertar';
  let daysRemainingInPhase = p1 - currentDay;

  if (currentDay <= p1) {
    phaseIndex = 1;
    phaseName = 'Despertar';
    daysRemainingInPhase = Math.max(0, p1 - currentDay);
  } else if (currentDay <= p2) {
    phaseIndex = 2;
    phaseName = 'Forja';
    daysRemainingInPhase = Math.max(0, p2 - currentDay);
  } else {
    phaseIndex = 3;
    phaseName = 'Mestria';
    daysRemainingInPhase = Math.max(0, targetDays - currentDay);
  }

  const todayRecord = activeCycle.checkIns[currentDay];
  const isTodayCheckedIn = Boolean(todayRecord?.checked);

  const completedTodayCount = (missions || []).filter((m) => m.isCompletedToday).length;
  const isTodayCompleted = isTodayCheckedIn || ((missions || []).length > 0 
    ? (completedTodayCount >= Math.max(1, Math.ceil((missions || []).length * 0.6)))
    : false);

  const totalDaysRemaining = Math.max(0, targetDays - currentDay);
  const protocolProgressPercent = Math.min(100, Math.floor((currentDay / targetDays) * 100));

  const currentWeek = getChallengeWeekNumber(currentDay);
  const missedDaysInCurrentWeek = getWeekMissedDays(activeCycle, currentWeek, currentDay);

  return {
    hasActiveChallenge: true,
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
  customChallenges: UserChallenge[] = [],
  missions: Mission[] = [],
  referenceDate?: string
): string[] {
  const presenceSet = new Set<string>();
  const todayStr = referenceDate && isValidDateString(referenceDate) ? referenceDate : getTodayString();
  const [ty, tm, td] = todayStr.split('-').map(Number);

  // 1. Presenças no Desafio Oficial Ativo (Ciclo dos 66 Dias)
  const activeCycle = profile.activeChallenge;
  if (activeCycle && activeCycle.checkIns) {
    const currentDay = Math.min(66, Math.max(1, activeCycle.currentDay || profile.currentProtocolDay || 1));

    Object.entries(activeCycle.checkIns).forEach(([dayKey, record]) => {
      if (record && record.checked) {
        const dayNum = Number(dayKey) || record.dayNumber || 1;

        // Se a data gravada for válida e no passado/hoje
        if (record.date && isValidDateString(record.date) && record.date <= todayStr) {
          // Caso a data gravada no dayNum anterior seja igual à de hoje por bug legado, ajusta para o dia correspondente
          if (dayNum < currentDay && record.date === todayStr) {
            const diffDays = currentDay - dayNum;
            const computedDate = new Date(ty, tm - 1, td - diffDays);
            const dateStr = `${computedDate.getFullYear()}-${String(computedDate.getMonth() + 1).padStart(2, '0')}-${String(computedDate.getDate()).padStart(2, '0')}`;
            if (isValidDateString(dateStr)) {
              presenceSet.add(dateStr);
            }
          } else {
            presenceSet.add(record.date);
          }
        } else {
          // Calcula data relativa a partir do currentDay e todayStr
          const diffDays = currentDay - dayNum;
          const computedDate = new Date(ty, tm - 1, td - diffDays);
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

  // 3. Presenças nas Missões Diárias do Desafio Oficial (useHabitStore.missions)
  (missions || []).forEach((mission) => {
    (mission.completedDates || []).forEach((dateStr) => {
      if (isValidDateString(dateStr) && dateStr <= todayStr) {
        presenceSet.add(dateStr);
      }
    });
  });

  // 4. Presenças em Desafios Personalizados Criados pelo Usuário
  customChallenges.forEach((challenge) => {
    // Ignora espelho do oficial para não duplicar com os check-ins oficiais
    if (challenge.isOfficial66 || challenge.id === 'challenge_official_66') {
      return;
    }
    (challenge.habits || []).forEach((habit) => {
      (habit.completedDates || []).forEach((dateStr) => {
        if (isValidDateString(dateStr) && dateStr <= todayStr) {
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
 * Reconstrói, cura e sincroniza o ciclo ativo do Desafio dos 66 Dias a partir do histórico
 * real de missões e presenças do usuário, recuperando qualquer falso reset e preenchendo
 * retroativamente as presenças dos dias cumpridos.
 */
export function reconcileChallengeCycleWithMissions(
  profile: UserProfile,
  missions: Mission[] = [],
  customChallenges: UserChallenge[] = [],
  referenceDate?: string
): {
  reconciledProfile: Partial<UserProfile>;
  wasHealed: boolean;
} {
  const todayStr = referenceDate && isValidDateString(referenceDate) ? referenceDate : getTodayString();
  const presenceDates = getAllChallengePresenceDates(profile, customChallenges, missions, todayStr);
  let activeCycle: ProtocolChallengeCycle | undefined = profile.activeChallenge && profile.activeChallenge.status === 'active'
    ? { ...profile.activeChallenge }
    : undefined;
  let challengeHistory = [...(profile.challengeHistory || [])];
  let currentProtocolDay = profile.currentProtocolDay || activeCycle?.currentDay || 0;
  let wasHealed = false;

  // 1. Detecta se ocorreu um falso reset arquivado no histórico
  if (challengeHistory.length > 0) {
    const latestArchived = challengeHistory[0];
    const isPhantomFailed = latestArchived.status === 'failed' && 
      (latestArchived.failedReason?.includes('2 dias sem presença') || latestArchived.daysCompleted === 0);
    
    // Se o ciclo ativo atual está zerado e o último arquivado tinha presenças OU foi um encerramento fantasma
    if (isPhantomFailed && (!activeCycle || activeCycle.daysCompleted === 0) && presenceDates.length > 0) {
      activeCycle = {
        ...latestArchived,
        status: 'active',
        endDate: undefined,
        failedReason: undefined,
        failedWeek: undefined,
      };
      challengeHistory = challengeHistory.slice(1);
      wasHealed = true;
    }
  }

  // Se NÃO houver ciclo ativo deliberadamente, não fabricamos um novo ciclo!
  if (!activeCycle) {
    const streakRes = calculateChallengeStreak(presenceDates, todayStr);
    return {
      reconciledProfile: {
        challengeHistory,
        currentStreak: streakRes.currentStreak,
        bestStreak: Math.max(profile.bestStreak || 0, streakRes.bestStreak, streakRes.currentStreak),
        lastActiveDate: todayStr,
      },
      wasHealed,
    };
  }

  // 2. Determina a data inicial do ciclo
  let cycleStartDate = activeCycle.startDate;
  if (!isValidDateString(cycleStartDate)) {
    if (presenceDates.length > 0) {
      cycleStartDate = presenceDates[0];
    } else {
      cycleStartDate = profile.lastActiveDate && isValidDateString(profile.lastActiveDate) ? profile.lastActiveDate : getTodayString();
    }
    activeCycle.startDate = cycleStartDate;
    wasHealed = true;
  }

  // 3. Reconcilia o currentProtocolDay com base na data de início e presenças
  const cycleTargetDays = activeCycle.targetDays || 66;
  const daysSinceStart = getDaysDifference(cycleStartDate, todayStr) + 1;
  const targetDay = Math.min(cycleTargetDays, Math.max(1, daysSinceStart, currentProtocolDay, activeCycle.currentDay || 1));
  currentProtocolDay = targetDay;
  activeCycle.currentDay = currentProtocolDay;

  // 4. Preenche e cura os checkIns com base nas presenças reais
  const updatedCheckIns: Record<number, DailyCheckInRecord> = { ...(activeCycle.checkIns || {}) };
  
  for (let d = 1; d <= currentProtocolDay; d++) {
    const dayDate = addDaysToDateString(cycleStartDate, d - 1);
    const hasPresence = presenceDates.includes(dayDate);
    const existing = updatedCheckIns[d];

    if (hasPresence) {
      if (!existing || !existing.checked) {
        updatedCheckIns[d] = {
          dayNumber: d,
          date: dayDate,
          checked: true,
          xpEarned: existing?.xpEarned || 100,
          targetXp: 100,
        };
        wasHealed = true;
      }
    } else if (!existing && d < currentProtocolDay) {
      updatedCheckIns[d] = {
        dayNumber: d,
        date: dayDate,
        checked: false,
        xpEarned: 0,
        targetXp: 100,
      };
    }
  }

  activeCycle.checkIns = updatedCheckIns;
  activeCycle.daysCompleted = Object.values(updatedCheckIns).filter((r) => r.checked).length;
  activeCycle.totalXpEarned = Object.values(updatedCheckIns).reduce((acc, r) => acc + (r.checked ? r.xpEarned : 0), 0);

  // 5. Recalcula streak a partir das presenças reais consolidadas
  const streakRes = calculateChallengeStreak(presenceDates, todayStr);

  return {
    reconciledProfile: {
      activeChallenge: activeCycle,
      challengeHistory,
      currentProtocolDay,
      currentStreak: streakRes.currentStreak,
      bestStreak: Math.max(profile.bestStreak || 0, streakRes.bestStreak, streakRes.currentStreak),
      lastActiveDate: todayStr,
    },
    wasHealed,
  };
}

/**
 * Processa a passagem de dias e aplica a REGRA CRÍTICA DE PHILLIPPA LALLY:
 * - 2 ausências não protegidas por escudo na mesma semana rompem o ciclo.
 * - Verifica obrigatoriamente se houve cumprimento de missões nas datas decorridas antes de considerar falta!
 * - Avança normalmente os dias do protocolo mantendo a integridade do estado.
 * - Se um desafio falhar ou for concluído, arquiva e NÃO inicia um novo automaticamente.
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
  completedOccurred?: boolean;
  completedCycle?: ProtocolChallengeCycle;
} {
  const lastActive = isValidDateString(profile.lastActiveDate) ? profile.lastActiveDate : todayStr;

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
  if (daysPassed <= 0) {
    return {
      updatedProfile: {},
      shieldConsumed: false,
      streakBroken: false,
      resetOccurred: false,
    };
  }

  // Se o usuário não possui desafio ativo no momento:
  // Apenas mantém os streaks de missões e desafios customizados sem criar ou quebrar ciclos.
  if (!profile.activeChallenge || profile.activeChallenge.status !== 'active') {
    const presenceDates = getAllChallengePresenceDates(profile, customChallenges, missions);
    const streakResult = calculateChallengeStreak(presenceDates, todayStr);
    return {
      updatedProfile: {
        currentStreak: streakResult.currentStreak,
        bestStreak: Math.max(profile.bestStreak || 0, streakResult.bestStreak, streakResult.currentStreak),
        lastActiveDate: todayStr,
      },
      shieldConsumed: false,
      streakBroken: false,
      resetOccurred: false,
    };
  }

  let activeCycle: ProtocolChallengeCycle | undefined = { ...profile.activeChallenge };
  let challengeHistory = [...(profile.challengeHistory || [])];

  let shieldConsumed = false;
  let streakBroken = false;
  let resetOccurred = false;
  let completedOccurred = false;
  let archivedCycle: ProtocolChallengeCycle | undefined;
  let completedCycle: ProtocolChallengeCycle | undefined;

  let newShields = profile.weeklyShieldsRemaining;
  let currentProtocolDay = activeCycle.currentDay || profile.currentProtocolDay || 1;

  // Coleta todas as presenças reais registradas em missões e desafios
  const presenceDates = getAllChallengePresenceDates(profile, customChallenges, missions);

  const targetDays = activeCycle.targetDays || 66;
  const requiredCompletedDays = Math.max(1, Math.floor(targetDays * 0.75));

  // Marca os dias passados checando obrigatoriamente se houve presença real
  for (let i = 0; i < daysPassed; i++) {
    const dateStr = addDaysToDateString(lastActive, i);
    const dayIndex = currentProtocolDay + i;

    if (dayIndex <= targetDays) {
      const hasPresence = presenceDates.includes(dateStr);
      if (!activeCycle.checkIns[dayIndex]) {
        activeCycle.checkIns[dayIndex] = {
          dayNumber: dayIndex,
          date: dateStr,
          checked: hasPresence,
          xpEarned: hasPresence ? 100 : 0,
          targetXp: 100,
        };
      } else if (hasPresence && !activeCycle.checkIns[dayIndex].checked) {
        // Corrige para presente caso as missões tenham sido cumpridas na data
        activeCycle.checkIns[dayIndex].checked = true;
        activeCycle.checkIns[dayIndex].xpEarned = activeCycle.checkIns[dayIndex].xpEarned || 100;
      }
    }
  }

  // Recalcula totais com base nos registros atualizados
  activeCycle.daysCompleted = Object.values(activeCycle.checkIns).filter((r) => r.checked).length;
  activeCycle.totalXpEarned = Object.values(activeCycle.checkIns).reduce((acc, r) => acc + (r.checked ? r.xpEarned : 0), 0);

  const previousWeek = getChallengeWeekNumber(currentProtocolDay);
  const targetDayAfterTransition = Math.min(targetDays, currentProtocolDay + daysPassed);
  const targetWeek = getChallengeWeekNumber(targetDayAfterTransition);

  // Se avançou de semana, renova o escudo de chakra semanal (1 tolerância/semana)
  if (targetWeek > previousWeek) {
    newShields = profile.weeklyShieldsMax || 1;
  }

  // Verifica se alguma semana do desafio acumulou 2 faltas NÃO PROTEGIDAS por escudo
  let weekWithTwoMisses: number | null = null;

  for (let w = 1; w <= targetWeek; w++) {
    const missedInWeek = getWeekMissedDays(activeCycle, w, targetDayAfterTransition);
    let unshieldedMisses = missedInWeek;

    if (missedInWeek > 0 && !profile.isHardModeEnabled && newShields > 0) {
      // O escudo semanal absorve 1 falta daquela semana
      newShields -= 1;
      shieldConsumed = true;
      unshieldedMisses = Math.max(0, missedInWeek - 1);
    }

    if (unshieldedMisses >= 2) {
      weekWithTwoMisses = w;
      break;
    }
  }

  // Proteção contra falsos resets em ciclos sem histórico ou fantasma
  const isPhantomCycle = activeCycle.daysCompleted === 0 && activeCycle.totalXpEarned === 0 && presenceDates.length === 0;

  if (weekWithTwoMisses !== null && !isPhantomCycle) {
    // REGRA DE ENCERRAMENTO REAL: 2 faltas não escudadas na mesma semana encerram o desafio
    resetOccurred = true;
    streakBroken = true;

    activeCycle.status = 'failed';
    activeCycle.endDate = todayStr;
    activeCycle.failedWeek = weekWithTwoMisses;
    activeCycle.failedReason = `2 dias sem presença na Semana ${weekWithTwoMisses}`;
    archivedCycle = { ...activeCycle };

    // Move para o histórico
    challengeHistory = [activeCycle, ...challengeHistory];

    // NOVA PREMISSA: Nenhum ciclo novo surge automaticamente.
    // O usuário decide quando e como personalizar e iniciar o próximo.
    activeCycle = undefined;
    currentProtocolDay = 0;
  } else {
    // Sem quebra do desafio: avança o dia do protocolo
    currentProtocolDay = targetDayAfterTransition;
    activeCycle.currentDay = currentProtocolDay;

    // Se completou a meta de dias com sucesso!
    if (currentProtocolDay >= targetDays && activeCycle.daysCompleted >= requiredCompletedDays) {
      activeCycle.status = 'completed';
      activeCycle.endDate = todayStr;
      activeCycle.completedAt = new Date().toISOString();
      challengeHistory = [activeCycle, ...challengeHistory];
      archivedCycle = { ...activeCycle };
      completedOccurred = true;
      completedCycle = { ...activeCycle };

      // NOVA PREMISSA: Arquiva a conclusão vitoriosa e aguarda o usuário iniciar o próximo.
      activeCycle = undefined;
      currentProtocolDay = 0;
    }
  }

  // Calcula a sequência estritamente a partir das presenças confirmadas
  const updatedProfileForCalculation: UserProfile = {
    ...profile,
    activeChallenge: activeCycle,
    challengeHistory,
    currentProtocolDay,
  };
  const updatedPresenceDates = getAllChallengePresenceDates(updatedProfileForCalculation, customChallenges, missions);
  const streakResult = calculateChallengeStreak(updatedPresenceDates, todayStr);

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
    completedOccurred,
    completedCycle,
  };
}

