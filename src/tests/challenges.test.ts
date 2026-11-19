import { describe, it, expect } from 'vitest';
import {
  activeMissionsOn,
  challengeStats,
  habitActiveOn,
  lastCountedDate,
  makeChallengeContext,
  mergeChallenge,
  mergeChallengeLists,
  mergeHabitLinks,
  normalizeChallengeData,
  HabitLinks,
} from '../core/challenges';
import { stableStringify } from '../core/syncMerge';
import { addDaysToDateString } from '../core/dateUtils';
import { Mission, ProtocolChallengeCycle, UserChallenge } from '../core/types';

// ── Fábricas ────────────────────────────────────────────────

const START = '2026-11-02'; // segunda-feira

const habit = (id: string, xp: number, dates: string[] = [], createdAt = '2026-10-30T10:00:00.000Z'): Mission => ({
  id,
  title: id,
  pillarId: 'chakra',
  rank: 'D',
  xpReward: xp,
  ryoReward: 35,
  timeOfDay: 'anytime',
  isCompletedToday: false,
  completedDates: dates,
  isCustom: true,
  order: 1,
  createdAt,
});

const challenge = (extra: Partial<UserChallenge> = {}): UserChallenge => ({
  v: 2,
  id: 'c1',
  title: 'Desafio',
  targetDays: 21,
  startDate: START,
  status: 'active',
  habits: [],
  format: 'habits',
  createdOn: '2026-11-01',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...extra,
});

const nth = (n: number) => addDaysToDateString(START, n - 1);
const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => nth(from + i));
const link = (challengeId: string | null, extra: Partial<HabitLinks[string]> = {}) => ({ challengeId, at: '2026-11-01T10:00:00.000Z', ...extra });

const statsOf = (c: UserChallenge, habits: Mission[], today: string, links?: HabitLinks) => {
  const l = links || Object.fromEntries(habits.map((h) => [h.id, link(c.id)]));
  return challengeStats(c, makeChallengeContext([c], habits, l), today);
};

const cycle = (extra: Partial<ProtocolChallengeCycle> = {}): ProtocolChallengeCycle => ({
  id: 'cycle_1',
  cycleNumber: 1,
  title: 'Protocolo',
  targetDays: 66,
  isEliteMode: false,
  startDate: '2026-11-08',
  status: 'active',
  currentDay: 1,
  daysCompleted: 0,
  checkIns: {},
  totalXpEarned: 0,
  createdAt: '2026-11-09T16:53:56.839Z',
  ...extra,
});

// ── Regras ──────────────────────────────────────────────────

describe('desafio: estado e indicadores calculados das marcações', () => {
  it('numera os dias a partir do início; antes disso está agendado', () => {
    expect(statsOf(challenge(), [], nth(1)).dayNumber).toBe(1);
    expect(statsOf(challenge(), [], nth(10)).dayNumber).toBe(10);
    const scheduled = statsOf(challenge(), [], addDaysToDateString(START, -3));
    expect(scheduled.state).toBe('scheduled');
    expect(scheduled.daysUntilStart).toBe(3);
  });

  it('o dia conta com metade do XP dos hábitos do desafio', () => {
    const habits = [habit('a', 100, [nth(1)]), habit('b', 100)];
    const s = statsOf(challenge(), habits, nth(1));
    expect(s.today).toMatchObject({ done: 1, total: 2, earnedXp: 100, targetXp: 200, neededXp: 100, completed: true });
  });

  it('faltas NÃO encerram o desafio: aparecem como faltas e pesam na adesão', () => {
    // dias 1–7: cumpre 1, 2, 5, 6; falta 3, 4 e 7 (três faltas na semana 1)
    const habits = [habit('a', 100, [nth(1), nth(2), nth(5), nth(6)])];
    const s = statsOf(challenge(), habits, nth(8));
    expect(s.state).toBe('active');
    expect(s.daysCompleted).toBe(4);
    expect(s.daysMissed).toBe(3);
    expect(s.adherence).toBe(57);
    expect(s.days.slice(0, 8).map((d) => d.status)).toEqual(['done', 'done', 'missed', 'missed', 'done', 'done', 'missed', 'today']);
  });

  it('hoje, ainda aberto, nunca é falta e não quebra a sequência', () => {
    const habits = [habit('a', 100, [nth(1), nth(2)])];
    const s = statsOf(challenge(), habits, nth(3));
    expect(s.daysMissed).toBe(0);
    expect(s.streak).toBe(2);
  });

  it('o dia de criação (e antes dele) nunca conta como falta', () => {
    const c = challenge({ createdOn: nth(3), createdAt: `${nth(3)}T22:30:00.000Z` });
    const s = statsOf(c, [habit('a', 100, [nth(4)])], nth(5));
    expect(s.days.slice(0, 5).map((d) => d.status)).toEqual(['grace', 'grace', 'grace', 'done', 'today']);
    expect(s.daysMissed).toBe(0);
  });

  it('Modo Elite: a primeira falta encerra; se o dia for corrigido, o desafio volta sozinho', () => {
    const c = challenge({ isEliteMode: true });
    const failed = statsOf(c, [habit('a', 100, [nth(1), nth(3)])], nth(4));
    expect(failed.state).toBe('failed');
    expect(failed.failedOn).toBe(nth(2));

    const healed = statsOf(c, [habit('a', 100, [nth(1), nth(2), nth(3)])], nth(4));
    expect(healed.state).toBe('active');
    expect(healed.failedOn).toBeUndefined();
  });

  it('só termina DEPOIS do último dia — o último dia é jogado — e aí paga o bônus', () => {
    const habits = [habit('a', 100, days(1, 21))];
    expect(statsOf(challenge(), habits, nth(21)).state).toBe('active');
    const done = statsOf(challenge(), habits, nth(22));
    expect(done.state).toBe('completed');
    expect(done.finishedNaturally).toBe(true);
    expect(done.daysCompleted).toBe(21);
    expect(done.adherence).toBe(100);
  });

  it('encerrado pelo shinobi: abandonado ou concluído antes, sem bônus; os dias depois não contam', () => {
    const closed = challenge({ closedAt: `${nth(5)}T20:00:00.000Z`, closedOn: nth(5), closeKind: 'abandoned' });
    const s = statsOf(closed, [habit('a', 100, days(1, 5))], nth(10));
    expect(s.state).toBe('abandoned');
    expect(s.finishedNaturally).toBe(false);
    expect(s.daysMissed).toBe(0);
    expect(s.days[7].status).toBe('closed');
    expect(lastCountedDate(closed)).toBe(nth(5));

    const early = statsOf({ ...closed, closeKind: 'completed' }, [habit('a', 100, days(1, 5))], nth(10));
    expect(early.state).toBe('completed');
    expect(early.finishedNaturally).toBe(false);
  });

  it('avaliar duas vezes os mesmos dados dá o mesmo resultado', () => {
    const habits = [habit('a', 100, [nth(1), nth(3)])];
    expect(stableStringify(statsOf(challenge(), habits, nth(5)))).toBe(stableStringify(statsOf(challenge(), habits, nth(5))));
  });
});

describe('hábitos: valem só enquanto o desafio deles corre', () => {
  const c = challenge();
  const ctx = (links: HabitLinks, list: UserChallenge[] = [c]) => makeChallengeContext(list, [], links).index;

  it('hábito de desafio vale dentro do período; depois do fim sai de Hoje', () => {
    const h = habit('a', 100);
    const index = ctx({ a: link('c1') });
    expect(habitActiveOn(h, { a: link('c1') }, index, nth(5))).toBe(true);
    expect(habitActiveOn(h, { a: link('c1') }, index, nth(22))).toBe(false);
    expect(habitActiveOn(h, { a: link('c1') }, index, addDaysToDateString(START, -1))).toBe(false);
  });

  it('hábito avulso vale sempre (a partir de quando foi criado)', () => {
    const h = habit('a', 100, [], `${nth(3)}T09:00:00.000Z`);
    expect(habitActiveOn(h, { a: link(null) }, ctx({}), nth(2))).toBe(false);
    expect(habitActiveOn(h, { a: link(null) }, ctx({}), nth(30))).toBe(true);
  });

  it('hábito retirado deixa de valer, mas os dias em que contou ficam', () => {
    const h = habit('a', 100, [nth(1), nth(2)]);
    const links = { a: link('c1', { until: nth(2) }) };
    expect(habitActiveOn(h, links, ctx(links), nth(2))).toBe(true);
    expect(habitActiveOn(h, links, ctx(links), nth(3))).toBe(false);
    expect(statsOf(c, [h], nth(4), links).daysCompleted).toBe(2);
  });

  it('hábito acrescentado no meio do desafio não cria faltas nos dias anteriores', () => {
    const a = habit('a', 100, days(1, 4));
    const late = habit('b', 300, [], `${nth(4)}T09:00:00.000Z`);
    const s = statsOf(c, [a, late], nth(5));
    // Dias 1–3 seguem cumpridos; a partir do dia 4 o hábito novo entra na meta (100 de 400 XP não basta)
    expect(s.days.slice(0, 4).map((d) => d.status)).toEqual(['done', 'done', 'done', 'missed']);
    expect(s.daysCompleted).toBe(3);
  });

  it('desafio excluído (ou de outro aparelho ainda não chegado): seus hábitos não valem', () => {
    const h = habit('a', 100);
    expect(activeMissionsOn([h], { a: link('sumiu') }, ctx({}), nth(1))).toEqual([]);
  });
});

// ── Conversão do formato antigo ─────────────────────────────

describe('conversão do formato antigo (idempotente)', () => {
  const realMissions = [
    habit('fisica', 85, ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-12'], '2026-11-09T16:54:00.199Z'),
    habit('respiracao', 85, ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-12'], '2026-11-09T16:54:00.199Z'),
    habit('leitura', 85, ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'], '2026-11-09T16:54:00.199Z'),
  ];

  it('CENÁRIO REAL: ciclo encerrado pela antiga regra de faltas volta ativo, com as missões dentro dele', () => {
    const failedByRule = cycle({
      status: 'failed',
      endedBy: undefined,
      endDate: '2026-11-11',
      failedReason: '2 faltas na Semana 1',
      graceBefore: '2026-11-09',
    });
    const data = normalizeChallengeData({ missions: realMissions, cycleHistory: [failedByRule], today: '2026-11-19' });
    expect(data.challenges).toHaveLength(1);
    const c = data.challenges[0];
    expect(c.closedAt).toBeUndefined();
    expect(Object.values(data.links).every((l) => l.challengeId === 'cycle_1')).toBe(true);

    const s = challengeStats(c, makeChallengeContext(data.challenges, data.missions, data.links), '2026-11-19');
    expect(s.state).toBe('active');
    expect(s.dayNumber).toBe(12);
    expect(s.daysCompleted).toBe(4);
    expect(s.today.total).toBe(3);
  });

  it('ciclo encerrado pelo próprio shinobi continua encerrado; as missões viram avulsas', () => {
    const abandoned = cycle({ status: 'failed', endedBy: 'user', endDate: '2026-11-12' });
    const data = normalizeChallengeData({ missions: realMissions, cycleHistory: [abandoned], today: '2026-11-19' });
    expect(data.challenges[0]).toMatchObject({ closeKind: 'abandoned', closedOn: '2026-11-12' });
    expect(Object.values(data.links).every((l) => l.challengeId === null)).toBe(true);
  });

  it('desafio personalizado antigo: os hábitos viram missões do desafio (mesmos ids)', () => {
    const custom: UserChallenge = {
      id: 'challenge_custom_1',
      title: 'Leitura',
      targetDays: 30,
      startDate: '2026-11-10',
      status: 'active',
      habits: [{ id: 'hab_1', title: 'Ler', completedDates: ['2026-11-10', '2026-11-11'], createdAt: '2026-11-10T08:00:00.000Z' }],
      createdAt: '2026-11-10T08:00:00.000Z',
    };
    const data = normalizeChallengeData({ challenges: [custom], missions: [], today: '2026-11-19' });
    expect(data.challenges[0]).toMatchObject({ v: 2, format: 'habits', habits: [] });
    expect(data.missions).toHaveLength(1);
    expect(data.missions[0]).toMatchObject({ id: 'hab_1', rank: 'E', xpReward: 25, completedDates: ['2026-11-10', '2026-11-11'] });
    expect(data.links.hab_1.challengeId).toBe('challenge_custom_1');
  });

  it('quadro de operação antigo continua com as marcações', () => {
    const board: UserChallenge = {
      id: 'challenge_board_1',
      title: 'Operação',
      targetDays: 40,
      startDate: '2026-11-19',
      status: 'active',
      habits: [],
      createdAt: '2026-11-19T10:00:00.000Z',
      format: 'board',
      sections: [{ id: 'rel', title: 'Relâmpago', kind: 'list', rows: [{ id: 'casa', label: 'Casa' }] }],
      marks: { '2026-11-19': ['rel.casa'] },
    };
    const data = normalizeChallengeData({ challenges: [board], missions: [], today: '2026-11-19' });
    expect(data.challenges[0]).toMatchObject({ v: 2, format: 'board', marks: { '2026-11-19': ['rel.casa'] } });
    expect(data.missions).toEqual([]);
  });

  it('rodar de novo sobre o resultado não muda nada', () => {
    const once = normalizeChallengeData({
      missions: realMissions,
      cycleHistory: [cycle({ status: 'failed', failedReason: '2 faltas na Semana 1', endDate: '2026-11-11' })],
      today: '2026-11-19',
    });
    const twice = normalizeChallengeData({ challenges: once.challenges, missions: once.missions, links: once.links, today: '2026-11-19' });
    expect(stableStringify(twice)).toBe(stableStringify(once));
  });
});

// ── Mesclagem entre aparelhos ───────────────────────────────

describe('mesclagem de desafios entre aparelhos', () => {
  const board = (extra: Partial<UserChallenge> = {}): UserChallenge =>
    challenge({
      id: 'b1',
      format: 'board',
      sections: [{ id: 's', title: 'S', kind: 'list', rows: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] }],
      marks: {},
      ...extra,
    });

  it('desafio criado em um aparelho não some pelo outro (união por id)', () => {
    const merged = mergeChallengeLists([challenge({ id: 'phone' })], [challenge({ id: 'pc', createdAt: '2026-11-02T10:00:00.000Z' })]);
    expect(merged.map((c) => c.id)).toEqual(['pc', 'phone']);
  });

  it('título, regras e decisões: vence a edição mais recente', () => {
    const older = challenge({ title: 'Antigo', updatedAt: '2026-11-05T10:00:00.000Z' });
    const newer = challenge({ title: 'Novo', closedAt: '2026-11-06T10:00:00.000Z', closedOn: nth(5), closeKind: 'abandoned', updatedAt: '2026-11-06T10:00:00.000Z' });
    expect(mergeChallenge(older, newer)).toMatchObject({ title: 'Novo', closeKind: 'abandoned' });
    expect(mergeChallenge(newer, older)).toMatchObject({ title: 'Novo', closeKind: 'abandoned' });
  });

  it('quadro: cada aparelho marcou uma célula no mesmo dia → as duas ficam', () => {
    const d = '2026-11-03';
    const phone = board({ marks: { [d]: ['s.a'] }, cellStamps: { [`${d}|s.a`]: { on: true, at: '2026-11-03T10:00:00.000Z' } } });
    const pc = board({ marks: { [d]: ['s.b'] }, cellStamps: { [`${d}|s.b`]: { on: true, at: '2026-11-03T11:00:00.000Z' } } });
    expect(mergeChallenge(phone, pc).marks).toEqual({ [d]: ['s.a', 's.b'] });
  });

  it('quadro: desmarcar depois vence a marcação antiga, inclusive do formato sem registro', () => {
    const d = '2026-11-03';
    const legacy = board({ marks: { [d]: ['s.a', 's.b'] } });
    const unmarked = board({ marks: { [d]: ['s.b'] }, cellStamps: { [`${d}|s.a`]: { on: false, at: '2026-11-03T12:00:00.000Z' } } });
    const merged = mergeChallenge(legacy, unmarked);
    expect(merged.marks).toEqual({ [d]: ['s.b'] });
    // Idempotente e simétrica
    expect(mergeChallenge(merged, legacy)).toEqual(merged);
    expect(stableStringify(mergeChallenge(unmarked, legacy))).toBe(stableStringify(merged));
  });

  it('desafio excluído não volta com dados antigos de outro aparelho', () => {
    const merged = mergeChallengeLists([challenge()], [], { c1: '2026-11-10T10:00:00.000Z' });
    expect(merged).toEqual([]);
  });

  it('vínculo do hábito: vence o mais recente (ex.: avulso levado para um desafio)', () => {
    const a = { h: { challengeId: null, at: '2026-11-01T10:00:00.000Z' } };
    const b = { h: { challengeId: 'c1', at: '2026-11-05T10:00:00.000Z' } };
    expect(mergeHabitLinks(a, b).h.challengeId).toBe('c1');
    expect(mergeHabitLinks(b, a).h.challengeId).toBe('c1');
  });
});
