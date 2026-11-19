import { ChallengeStats } from '../../core/challenges';
import { formatDateBR } from '../../core/dateUtils';
import { UserChallenge } from '../../core/types';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Rótulo curto do estado do desafio (sempre em palavras, nunca só por cor). */
export function challengeStateLabel(challenge: UserChallenge, stats: ChallengeStats): string {
  switch (stats.state) {
    case 'scheduled':
      return stats.daysUntilStart === 1 ? 'Começa amanhã' : `Começa em ${stats.daysUntilStart} dias`;
    case 'active':
      return `Dia ${stats.dayNumber} de ${stats.targetDays} · ${stats.phase}`;
    case 'completed':
      return challenge.closedAt ? 'Concluído antes do fim' : 'Concluído';
    case 'failed':
      return 'Encerrado no Modo Elite';
    case 'abandoned':
      return 'Encerrado por você';
  }
}

/** Linha de resumo do andamento (faltas e adesão) para listas. */
export function challengeProgressLine(stats: ChallengeStats): string {
  if (stats.state === 'scheduled') return `${stats.targetDays} dias`;
  const parts = [`${plural(stats.daysCompleted, 'dia cumprido', 'dias cumpridos')}`];
  if (stats.daysMissed > 0) parts.push(plural(stats.daysMissed, 'falta', 'faltas'));
  if (stats.daysCompleted + stats.daysMissed > 0) parts.push(`${stats.adherence}% de adesão`);
  return parts.join(' · ');
}

/** Explicação do encerramento, para o detalhe do desafio. */
export function challengeEndNote(challenge: UserChallenge, stats: ChallengeStats): string | null {
  if (stats.state === 'failed' && stats.failedOn)
    return `No Modo Elite qualquer falta encerra o desafio. A falta de ${formatDateBR(stats.failedOn)} encerrou este.`;
  if (stats.state === 'abandoned') return `Você encerrou este desafio em ${formatDateBR(challenge.closedOn)}.`;
  if (stats.state === 'completed' && challenge.closedAt)
    return `Você marcou como concluído em ${formatDateBR(challenge.closedOn)}, antes do fim previsto.`;
  if (stats.state === 'completed') return `Chegou ao fim em ${formatDateBR(stats.endDate)}.`;
  if (stats.state === 'scheduled') return `O dia 1 é ${formatDateBR(challenge.startDate)}.`;
  return null;
}
