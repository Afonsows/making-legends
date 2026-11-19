import { Mission, DayRecord } from './types';
import { getWeekKey } from './dateUtils';
import { settleDayLog, countCompletedDays, MissionFilter } from './dayLog';
import {
  ShieldContext,
  allocateShields,
  computeCurrentStreak,
  computeBestStreak,
  getWeeklyShieldCapacity,
  countShieldsUsedInWeek,
} from './streak';

/**
 * RECONCILIAÇÃO DA PROGRESSÃO
 * ─────────────────────────────────────────────────────────────
 * Ponto ÚNICO onde dias, escudos e sequência são decididos.
 * Qualquer coisa que mude os dados (marcar missão, virar o dia, editar,
 * sincronizar outro aparelho) termina chamando esta função.
 *
 * Os desafios NÃO são decididos aqui: o estado de cada um é calculado
 * na hora a partir das marcações (ver `core/challenges.ts`).
 *
 * Ela é pura e idempotente: mesmos dados → mesmo resultado, quantas
 * vezes rodar. Não toca em som, tela nem armazenamento — devolve os
 * EVENTOS para a camada de interface reagir.
 */

export interface ProgressionState {
  dayLog: Record<string, DayRecord>;
  shieldedDates: string[];
  shieldsThrough?: string;
  bestStreak: number;
}

export interface ProgressionOptions {
  today: string;
  missions: Mission[];
  shield: ShieldContext;
  /** Quais missões valem em cada dia (hábitos de desafios encerrados não contam). */
  isActive?: MissionFilter;
  /**
   * `false` enquanto os dados da nuvem ainda não chegaram: só o dia de hoje é
   * atualizado. Nenhum dia é fechado e nenhum escudo é gasto com informação
   * possivelmente desatualizada.
   */
  settlePast?: boolean;
}

export type ProgressionEvent = { type: 'shields_used'; dates: string[] };

export interface ProgressionResult extends ProgressionState {
  currentStreak: number;
  completedDays: number;
  weeklyShieldsMax: number;
  weeklyShieldsRemaining: number;
  events: ProgressionEvent[];
}

export function reconcileProgression(state: ProgressionState, options: ProgressionOptions): ProgressionResult {
  const { today, missions, shield } = options;
  const settlePast = options.settlePast !== false;
  const events: ProgressionEvent[] = [];

  // 1. Registro diário, a partir dos fatos
  const { dayLog } = settleDayLog(state.dayLog || {}, missions, today, { closePast: settlePast, isActive: options.isActive });

  // 2. Escudos de Chakra dos dias recém-encerrados
  let shieldedDates = state.shieldedDates || [];
  let shieldsThrough = state.shieldsThrough;
  if (settlePast) {
    const allocation = allocateShields(dayLog, shieldedDates, shieldsThrough, today, shield);
    shieldedDates = allocation.shieldedDates;
    shieldsThrough = allocation.shieldsThrough;
    if (allocation.newlyShielded.length > 0) events.push({ type: 'shields_used', dates: allocation.newlyShielded });
  }

  // 3. Derivados
  const currentStreak = computeCurrentStreak(dayLog, shieldedDates, today);
  const bestStreak = Math.max(state.bestStreak || 0, currentStreak, computeBestStreak(dayLog, shieldedDates));
  const week = getWeekKey(today);
  const weeklyShieldsMax = getWeeklyShieldCapacity(shield, week);

  return {
    dayLog,
    shieldedDates,
    shieldsThrough,
    bestStreak,
    currentStreak,
    completedDays: countCompletedDays(dayLog),
    weeklyShieldsMax,
    weeklyShieldsRemaining: Math.max(0, weeklyShieldsMax - countShieldsUsedInWeek(shieldedDates, week)),
    events,
  };
}
