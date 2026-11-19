/**
 * Ponto de entrada do motor de progressão.
 * A lógica vive em módulos pequenos e puros; este arquivo só reexporta
 * para que telas e stores importem de um lugar só.
 *
 *  dayLog.ts       registro diário (fatos → Dia Cumprido)
 *  streak.ts       sequência e Escudo de Chakra
 *  challenges.ts   desafios: estado e indicadores derivados das marcações
 *  cycle.ts        leitura dos ciclos do formato antigo
 *  ledger.ts       livro-razão de XP/Ryō (totais sempre derivados)
 *  progression.ts  reconciliação única de dias, escudos e sequência
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
export * from './challenges';

import { UserProfile, Mission, DayRecord } from './types';
import { getTodayString, isValidDateString } from './dateUtils';
import { settleDay } from './dayLog';

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
