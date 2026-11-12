/**
 * Ponto de entrada do motor de progressão.
 * A lógica vive em módulos pequenos e puros; este arquivo só reexporta
 * para que telas e stores importem de um lugar só.
 *
 *  dayLog.ts       registro diário (fatos → Dia Cumprido)
 *  streak.ts       sequência e Escudo de Chakra
 *  cycle.ts        desafio: regra semanal de faltas, conclusão, restauração
 *  ledger.ts       livro-razão de XP/Ryō (totais sempre derivados)
 *  progression.ts  reconciliação única + status para a interface
 *  syncMerge.ts    mesclagem entre aparelhos
 */

export {
  getTodayString,
  isValidDateString,
  addDaysToDateString,
  getDaysDifference,
  formatDateBR,
  daysBetween,
  getWeekKey,
} from './dateUtils';

export * from './dayLog';
export * from './streak';
export * from './cycle';
export * from './progression';

import { UserProfile, Mission, DayRecord, ProtocolChallengeCycle } from './types';
import { getTodayString, isValidDateString } from './dateUtils';
import { settleDay } from './dayLog';

/** Retorna o ciclo ativo, se houver. */
export function ensureActiveChallenge(profile: UserProfile): ProtocolChallengeCycle | undefined {
  return profile.activeChallenge && profile.activeChallenge.status === 'active' ? profile.activeChallenge : undefined;
}

/**
 * Migração de dados legados (v1 → v2): reconstrói o histórico diário a partir
 * dos check-ins de ciclos e das datas de conclusão das missões.
 */
export function buildDayLogFromLegacy(
  profile: Partial<UserProfile>,
  missions: Mission[],
  today: string = getTodayString()
): Record<string, DayRecord> {
  const log: Record<string, DayRecord> = {};
  const totalTarget = (missions || []).reduce((acc, m) => acc + Math.max(0, m.xpReward || 0), 0);

  const dates = new Set<string>();
  (missions || []).forEach((m) => (m.completedDates || []).forEach((d) => isValidDateString(d) && d <= today && dates.add(d)));
  dates.forEach((date) => {
    log[date] = { ...settleDay(undefined, missions, date, today) };
    if (log[date].xpTarget === 0) log[date].xpTarget = totalTarget;
  });

  const cycles = [...(profile.activeChallenge ? [profile.activeChallenge] : []), ...(profile.challengeHistory || [])];
  cycles.forEach((cycle) => {
    Object.values(cycle?.checkIns || {}).forEach((rec) => {
      if (!rec?.checked || !isValidDateString(rec.date) || rec.date > today) return;
      const prev = log[rec.date];
      log[rec.date] = {
        date: rec.date,
        xpEarned: Math.max(prev?.xpEarned || 0, rec.xpEarned || 0),
        xpTarget: prev?.xpTarget || rec.targetXp || totalTarget,
        completed: true,
        closed: rec.date < today,
      };
    });
  });

  return log;
}
