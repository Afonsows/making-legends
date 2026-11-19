import { ProtocolChallengeCycle } from './types';
import { addDaysToDateString, localDateFromIso, isValidDateString } from './dateUtils';

/**
 * CICLOS DO FORMATO ANTIGO
 * ─────────────────────────────────────────────────────────────
 * O antigo "desafio principal" (ciclo) foi substituído pelo modelo único de
 * desafios (`core/challenges.ts`). Aqui ficam só os utilitários usados para
 * ler e converter os ciclos guardados no formato antigo.
 */

export const ABANDONED_REASON = 'Encerrado pelo próprio shinobi';
export const REPLACED_REASON = 'Substituído por um novo desafio';

export function getCycleTargetDays(cycle?: Pick<ProtocolChallengeCycle, 'targetDays'> | null): number {
  return Math.max(1, Math.round(cycle?.targetDays || 66));
}

/**
 * Primeiro dia que PODE contar como falta.
 * O dia em que o desafio foi criado (e qualquer dia anterior a ele) nunca conta:
 * ninguém começa um desafio às 22h já devendo uma falta.
 */
export function getCycleGraceBefore(
  cycle: Pick<ProtocolChallengeCycle, 'startDate' | 'createdAt' | 'createdOn' | 'graceBefore'>
): string | undefined {
  let grace = isValidDateString(cycle.graceBefore) ? cycle.graceBefore : undefined;
  const createdOn = isValidDateString(cycle.createdOn) ? cycle.createdOn : localDateFromIso(cycle.createdAt);
  if (createdOn && createdOn >= cycle.startDate) {
    const afterCreation = addDaysToDateString(createdOn, 1);
    if (!grace || afterCreation > grace) grace = afterCreation;
  }
  return grace;
}

/** O ciclo foi encerrado por decisão do shinobi (e não pela antiga regra de faltas)? */
export function isUserEndedCycle(cycle: ProtocolChallengeCycle): boolean {
  if (cycle.endedBy) return cycle.endedBy === 'user';
  return cycle.failedReason === ABANDONED_REASON || cycle.failedReason === REPLACED_REASON;
}
