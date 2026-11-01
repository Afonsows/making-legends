import { Mission, TimeOfDay } from './types';
import { MissionRank, PillarId } from '../theme/types';
import { shinobiTheme } from '../theme/shinobi.theme';

export interface QuizAnswers {
  goal: 'all' | 'body' | 'focus' | 'mind' | string;
  screenTime: 'high' | 'medium' | 'low' | string;
  workout: 'low' | 'medium' | 'high' | string;
  reading: 'low' | 'medium' | 'high' | string;
  obstacle: 'procrastination' | 'streak_break' | 'no_game' | string;
}

const RANK_ORDER: MissionRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const upgrade = (rank: MissionRank, steps = 1): MissionRank =>
  RANK_ORDER[Math.min(RANK_ORDER.length - 1, RANK_ORDER.indexOf(rank) + steps)];

/**
 * Gera o Pergaminho de Missões inicial a partir do quiz de aptidão.
 * Começa leve onde a pessoa está mais fraca (regra dos 2 minutos) e mais
 * exigente onde ela já tem base — e reforça o pilar escolhido como objetivo.
 */
export function generateStarterMissions(answers: QuizAnswers): Mission[] {
  const list: { title: string; description: string; pillarId: PillarId; rank: MissionRank; timeOfDay: TimeOfDay }[] = [];

  list.push(
    answers.screenTime === 'high'
      ? { title: 'Despertar sem telas (30 min)', description: 'Nada de redes sociais nos primeiros 30 minutos do dia. Beba 500ml de água.', pillarId: 'chakra', rank: 'D', timeOfDay: 'morning' }
      : { title: 'Despertar sem telas & hidratação', description: 'Beba 500ml de água e fique 15 minutos sem redes sociais após acordar.', pillarId: 'chakra', rank: 'E', timeOfDay: 'morning' }
  );

  let training: (typeof list)[number] =
    answers.workout === 'high'
      ? { title: 'Treino intenso de Taijutsu', description: '60+ minutos de treino com progressão de carga, ritmo ou distância.', pillarId: 'taijutsu', rank: 'B', timeOfDay: 'morning' }
      : answers.workout === 'medium'
      ? { title: 'Treinamento de Taijutsu', description: '30 a 45 minutos de força, corrida ou calistenia com boa postura.', pillarId: 'taijutsu', rank: 'C', timeOfDay: 'morning' }
      : { title: 'Movimento diário', description: '20 minutos de caminhada, mobilidade ou exercícios leves. O importante é não falhar.', pillarId: 'taijutsu', rank: 'D', timeOfDay: 'morning' };

  let reading: (typeof list)[number] =
    answers.reading === 'high'
      ? { title: 'Estudo profundo dos pergaminhos', description: '30 minutos de leitura técnica + um resumo de 3 linhas do que aprendeu.', pillarId: 'ninjutsu', rank: 'C', timeOfDay: 'afternoon' }
      : answers.reading === 'medium'
      ? { title: 'Leitura com anotação', description: 'Ler 15 páginas e anotar 1 ideia que você vai aplicar.', pillarId: 'ninjutsu', rank: 'D', timeOfDay: 'afternoon' }
      : { title: 'Abrir o livro (5 páginas)', description: 'Só 5 páginas. Começar pequeno é o jutsu mais poderoso contra a inércia.', pillarId: 'ninjutsu', rank: 'E', timeOfDay: 'evening' };

  let focus: (typeof list)[number] =
    answers.screenTime === 'low'
      ? { title: 'Foco profundo de 90 minutos', description: 'Um bloco longo na tarefa mais importante, celular em outro cômodo.', pillarId: 'genjutsu', rank: 'A', timeOfDay: 'afternoon' }
      : answers.screenTime === 'medium'
      ? { title: 'Sessão de foco (45 min)', description: '45 minutos de trabalho focado, sem abas inúteis e com notificações desligadas.', pillarId: 'genjutsu', rank: 'B', timeOfDay: 'afternoon' }
      : { title: 'Bloco de foco (25 min)', description: 'Um Pomodoro de 25 minutos sem celular. Use a ferramenta de Concentração.', pillarId: 'genjutsu', rank: 'D', timeOfDay: 'afternoon' };

  if (answers.goal === 'body') training = { ...training, rank: upgrade(training.rank) };
  if (answers.goal === 'mind') reading = { ...reading, rank: upgrade(reading.rank) };
  if (answers.goal === 'focus') focus = { ...focus, rank: upgrade(focus.rank) };
  list.push(training, reading, focus);

  list.push(
    answers.obstacle === 'streak_break'
      ? { title: 'Nunca falhe duas vezes', description: 'Revise o dia em 2 minutos: o que funcionou e o que ajustar amanhã.', pillarId: 'espirito', rank: 'E', timeOfDay: 'evening' }
      : answers.obstacle === 'no_game'
      ? { title: 'Ato de coragem do dia', description: 'Faça uma coisa que te deixa desconfortável: uma conversa, um pedido, um primeiro passo.', pillarId: 'espirito', rank: 'D', timeOfDay: 'anytime' }
      : { title: 'Comece pelo mais difícil', description: 'Inicie a tarefa mais desconfortável em menos de 2 minutos, antes de qualquer outra coisa.', pillarId: 'espirito', rank: 'D', timeOfDay: 'morning' }
  );

  list.push({ title: 'Desligamento noturno', description: 'Planeje as missões de amanhã e desligue as telas 30 minutos antes de dormir.', pillarId: 'chakra', rank: 'E', timeOfDay: 'evening' });

  const now = new Date().toISOString();
  return list.map((m, idx) => {
    const info = shinobiTheme.missionRanks[m.rank];
    return {
      id: `mis_quiz_${Date.now()}_${idx}`,
      ...m,
      xpReward: info.xpReward,
      ryoReward: info.ryoReward,
      isCompletedToday: false,
      completedDates: [],
      isCustom: false,
      order: idx + 1,
      createdAt: now,
    };
  });
}
