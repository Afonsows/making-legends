import { UserProfile, Mission } from './types';

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
 * Calcula o status detalhado do protocolo de 66 dias para o usuário.
 */
export function evaluateProtocolStatus(
  profile: UserProfile,
  missions: Mission[]
): ProtocolStatus {
  const currentDay = Math.min(66, Math.max(1, profile.currentProtocolDay));
  
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

  const completedTodayCount = missions.filter(m => m.isCompletedToday).length;
  // Considera o dia concluído se pelo menos 60% das missões ativas foram feitas ou no mínimo 3
  const isTodayCompleted = missions.length > 0 
    ? (completedTodayCount >= Math.max(1, Math.ceil(missions.length * 0.6)))
    : false;

  const totalDaysRemaining = Math.max(0, 66 - currentDay);
  const protocolProgressPercent = Math.min(100, Math.floor((currentDay / 66) * 100));

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
  };
}

/**
 * Processa a passagem de dias, gerencia o Escudo de Chakra semanal e avança o protocolo.
 */
export function processDayTransition(
  profile: UserProfile,
  todayStr: string
): { updatedProfile: Partial<UserProfile>; shieldConsumed: boolean; streakBroken: boolean } {
  const lastActive = profile.lastActiveDate;
  
  // Se é o mesmo dia, não há transição
  if (lastActive === todayStr) {
    return {
      updatedProfile: {},
      shieldConsumed: false,
      streakBroken: false,
    };
  }

  const daysPassed = getDaysDifference(lastActive, todayStr);
  let shieldConsumed = false;
  let streakBroken = false;
  let newStreak = profile.currentStreak;
  let newProtocolDay = profile.currentProtocolDay;
  let newShields = profile.weeklyShieldsRemaining;

  if (daysPassed === 1) {
    // Dia consecutivo perfeito
    newStreak += 1;
    newProtocolDay = Math.min(66, newProtocolDay + 1);
  } else if (daysPassed === 2) {
    // Perdeu 1 dia: Testar Escudo de Chakra Semanal (tolerância de Phillippa Lally)
    if (!profile.isHardModeEnabled && newShields > 0) {
      // Consome 1 escudo e mantém a sequência viva!
      newShields -= 1;
      shieldConsumed = true;
      newProtocolDay = Math.min(66, newProtocolDay + 1);
    } else {
      // Sem escudo ou no Modo Elite: Quebrou a sequência
      streakBroken = true;
      newStreak = 1;
    }
  } else {
    // Mais de 2 dias ausente: reinício de streak
    streakBroken = true;
    newStreak = 1;
  }

  const bestStreak = Math.max(profile.bestStreak, newStreak);

  return {
    updatedProfile: {
      currentStreak: newStreak,
      bestStreak,
      currentProtocolDay: newProtocolDay,
      weeklyShieldsRemaining: newShields,
      lastActiveDate: todayStr,
    },
    shieldConsumed,
    streakBroken,
  };
}
