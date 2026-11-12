import { describe, it, expect } from 'vitest';
import {
  getLevelFromTotalXp,
  getRequiredXpForLevel,
  getRankIdFromLevel,
  getLevelProgress,
  calculateXpGainWithBuffs,
} from '../core/xpEngine';
import { calculateRyoGainWithBuffs, getLevelUpRyoBetween, getLevelUpRyoReward } from '../core/ryoEngine';
import {
  calculateDailyXpProgress,
  buildDayRecord,
  settleDayLog,
  computeCurrentStreak,
  computeBestStreak,
  applyShieldsToClosedDays,
  evaluateChallengeCycle,
  getCycleDayNumber,
  buildDayLogFromLegacy,
} from '../core/streakEngine';
import { addDaysToDateString, daysBetween, getWeekKey, isValidDateString } from '../core/dateUtils';
import { applyDamageToAdversary, revertDamageEntries, calculateDuelDamage, deriveInventory } from '../core/duelEngine';
import { originalAdversaries } from '../core/adversariesData';
import { allGameItems } from '../core/itemsData';
import { DayRecord, Mission, ProtocolChallengeCycle } from '../core/types';

const day = (date: string, completed: boolean, closed = true): DayRecord => ({
  date,
  xpEarned: completed ? 200 : 0,
  xpTarget: 375,
  completed,
  closed,
});

const mission = (id: string, xp: number, dates: string[] = []): Mission => ({
  id,
  title: id,
  pillarId: 'chakra',
  rank: 'D',
  xpReward: xp,
  ryoReward: 35,
  timeOfDay: 'anytime',
  isCompletedToday: false,
  completedDates: dates,
  isCustom: false,
  order: 1,
  createdAt: '',
});

const cycle = (startDate: string, targetDays = 66, isEliteMode = false): ProtocolChallengeCycle => ({
  id: 'c1',
  cycleNumber: 1,
  startDate,
  targetDays,
  isEliteMode,
  status: 'active',
  currentDay: 1,
  daysCompleted: 0,
  checkIns: {},
  totalXpEarned: 0,
  createdAt: '',
});

describe('datas', () => {
  it('valida e soma datas no calendário local', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2024-02-29')).toBe(true);
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-11-01', '2026-11-03')).toBe(2);
    expect(daysBetween('2026-11-03', '2026-11-01')).toBe(-2);
  });

  it('agrupa semanas a partir de segunda-feira', () => {
    expect(getWeekKey('2026-11-01')).toBe('2026-10-26'); // domingo → semana da segunda anterior
    expect(getWeekKey('2026-11-02')).toBe('2026-11-02'); // segunda
  });
});

describe('curva de XP e patentes', () => {
  it('é contínua e crescente', () => {
    for (let lvl = 2; lvl < 100; lvl++) {
      const cost = getRequiredXpForLevel(lvl + 1) - getRequiredXpForLevel(lvl);
      const prevCost = getRequiredXpForLevel(lvl) - getRequiredXpForLevel(lvl - 1);
      expect(cost).toBeGreaterThanOrEqual(prevCost);
    }
  });

  it('mantém um ritmo humano (~400 XP por dia)', () => {
    const daysTo = (level: number) => getRequiredXpForLevel(level) / 400;
    expect(daysTo(2)).toBeLessThanOrEqual(1);
    expect(daysTo(5)).toBeLessThan(8);
    expect(daysTo(22)).toBeGreaterThan(50);
    expect(daysTo(22)).toBeLessThan(90);
    expect(daysTo(66)).toBeGreaterThan(330);
    expect(daysTo(66)).toBeLessThan(550);
  });

  it('nível e patente derivam do XP total', () => {
    expect(getLevelFromTotalXp(0)).toBe(1);
    expect(getLevelFromTotalXp(getRequiredXpForLevel(5))).toBe(5);
    expect(getLevelFromTotalXp(getRequiredXpForLevel(5) - 1)).toBe(4);
    expect(getRankIdFromLevel(5)).toBe('genin');
    expect(getRankIdFromLevel(66)).toBe('kage');
    const progress = getLevelProgress(getRequiredXpForLevel(3) + 10);
    expect(progress.currentLevel).toBe(3);
    expect(progress.currentLevelXp).toBe(10);
  });

  it('soma os bônus de XP (relíquias, Elite e Pílula) de forma aditiva', () => {
    const items = [allGameItems.pesos_ferro_negro, allGameItems.lente_da_lenda_forjada];
    expect(calculateXpGainWithBuffs(100, 'taijutsu', items).finalXp).toBe(135); // +15% +20%
    expect(calculateXpGainWithBuffs(100, 'ninjutsu', items).finalXp).toBe(120); // só o geral
    expect(calculateXpGainWithBuffs(100, 'ninjutsu', [], { isEliteMode: true }).finalXp).toBe(120);
    expect(calculateXpGainWithBuffs(100, 'ninjutsu', [], { isEliteMode: true, soldierPillActive: true }).finalXp).toBe(145);
  });
});

describe('Ryō', () => {
  it('aplica bônus de sequência e patente', () => {
    expect(calculateRyoGainWithBuffs(100, 0, 1).finalRyo).toBe(100);
    expect(calculateRyoGainWithBuffs(100, 7, 1).finalRyo).toBe(110);
    expect(calculateRyoGainWithBuffs(100, 7, 12).finalRyo).toBe(120);
    expect(calculateRyoGainWithBuffs(0, 30, 50).finalRyo).toBe(0);
  });

  it('soma o Ryō de promoção entre níveis', () => {
    expect(getLevelUpRyoBetween(1, 3)).toBe(getLevelUpRyoReward(2) + getLevelUpRyoReward(3));
    expect(getLevelUpRyoBetween(3, 3)).toBe(0);
  });
});

describe('progresso diário', () => {
  const today = '2026-11-10';
  const missions = [mission('a', 100, [today]), mission('b', 100), mission('c', 50)];

  it('libera o Dia Cumprido com 50% do XP previsto', () => {
    const p = calculateDailyXpProgress(missions, today);
    expect(p.totalTargetXp).toBe(250);
    expect(p.currentXp).toBe(100);
    expect(p.target50PctXp).toBe(125);
    expect(p.isUnlocked).toBe(false);
    const p2 = calculateDailyXpProgress([...missions.slice(1), mission('a', 100, [today]), mission('d', 50, [today])], today);
    // 150 de 300 XP = exatamente 50%
    expect(p2.isUnlocked).toBe(true);
  });

  it('sem missões não há dia cumprido', () => {
    expect(calculateDailyXpProgress([], today).isUnlocked).toBe(false);
  });

  it('fecha dias passados e os congela', () => {
    const ms = [mission('a', 100, ['2026-11-08']), mission('b', 100)];
    const seed = { '2026-11-07': buildDayRecord(ms, '2026-11-07', false) };
    const { dayLog, changedDates } = settleDayLog(seed, ms, today);
    expect(changedDates).toEqual(['2026-11-07', '2026-11-08', '2026-11-09', today]);
    expect(dayLog['2026-11-08'].completed).toBe(true);
    expect(dayLog['2026-11-09'].completed).toBe(false);
    expect(dayLog['2026-11-09'].closed).toBe(true);
    // Registro congelado não muda mesmo que a missão seja editada depois
    const frozen = buildDayRecord([], '2026-11-08', true, dayLog['2026-11-08']);
    expect(frozen.completed).toBe(true);
  });
});

describe('sequência e Escudo de Chakra', () => {
  const today = '2026-11-12';

  it('conta dias seguidos e não quebra enquanto hoje está em andamento', () => {
    const log = {
      '2026-11-09': day('2026-11-09', true),
      '2026-11-10': day('2026-11-10', true),
      '2026-11-11': day('2026-11-11', true),
      '2026-11-12': day('2026-11-12', false, false),
    };
    expect(computeCurrentStreak(log, [], today)).toBe(3);
    expect(computeCurrentStreak({ ...log, '2026-11-12': day('2026-11-12', true, false) }, [], today)).toBe(4);
  });

  it('zera quando ontem foi perdido sem escudo', () => {
    const log = { '2026-11-10': day('2026-11-10', true), '2026-11-11': day('2026-11-11', false) };
    expect(computeCurrentStreak(log, [], today)).toBe(0);
    expect(computeCurrentStreak(log, ['2026-11-11'], today)).toBe(1);
  });

  it('usa 1 escudo por semana para proteger uma sequência ativa', () => {
    const log = {
      '2026-11-09': day('2026-11-09', true),
      '2026-11-10': day('2026-11-10', false),
      '2026-11-11': day('2026-11-11', false),
    };
    const ctx = { isEliteMode: false, equippedItems: [], extraShieldWeeks: [] };
    const res = applyShieldsToClosedDays(log, [], ['2026-11-10', '2026-11-11'], ctx);
    expect(res.newlyShielded).toEqual(['2026-11-10']);
    expect(computeCurrentStreak(log, res.shieldedDates, today)).toBe(0); // segunda falta quebra
  });

  it('não gasta escudo sem sequência ativa nem no Modo Elite', () => {
    const log = { '2026-11-10': day('2026-11-10', false) };
    const ctx = { isEliteMode: false, equippedItems: [], extraShieldWeeks: [] };
    expect(applyShieldsToClosedDays(log, [], ['2026-11-10'], ctx).newlyShielded).toEqual([]);
    const log2 = { '2026-11-09': day('2026-11-09', true), '2026-11-10': day('2026-11-10', false) };
    expect(applyShieldsToClosedDays(log2, [], ['2026-11-10'], { ...ctx, isEliteMode: true }).newlyShielded).toEqual([]);
  });

  it('relíquia de escudo extra aumenta a capacidade', () => {
    const log = {
      '2026-11-09': day('2026-11-09', true),
      '2026-11-10': day('2026-11-10', false),
      '2026-11-11': day('2026-11-11', false),
    };
    const ctx = { isEliteMode: false, equippedItems: [allGameItems.pedra_do_selamento_ancestral], extraShieldWeeks: [] };
    const res = applyShieldsToClosedDays(log, [], ['2026-11-10', '2026-11-11'], ctx);
    expect(res.newlyShielded).toEqual(['2026-11-10', '2026-11-11']);
    expect(computeCurrentStreak(log, res.shieldedDates, today)).toBe(1);
  });

  it('calcula o recorde atravessando dias protegidos', () => {
    const log = {
      '2026-11-01': day('2026-11-01', true),
      '2026-11-02': day('2026-11-02', true),
      '2026-11-03': day('2026-11-03', false),
      '2026-11-04': day('2026-11-04', true),
      '2026-11-05': day('2026-11-05', false),
      '2026-11-06': day('2026-11-06', true),
    };
    expect(computeBestStreak(log, [])).toBe(2);
    expect(computeBestStreak(log, ['2026-11-03'])).toBe(3);
  });
});

describe('desafio (ciclo)', () => {
  const start = '2026-11-02';
  const fill = (from: number, to: number, completed: boolean, log: Record<string, DayRecord> = {}) => {
    for (let n = from; n <= to; n++) {
      const d = addDaysToDateString(start, n - 1);
      log[d] = day(d, completed);
    }
    return log;
  };

  it('numera os dias a partir da data de início', () => {
    expect(getCycleDayNumber(cycle(start), start)).toBe(1);
    expect(getCycleDayNumber(cycle(start), addDaysToDateString(start, 65))).toBe(66);
    expect(getCycleDayNumber(cycle(start), addDaysToDateString(start, -2))).toBe(-1);
  });

  it('tolera 1 falta por semana', () => {
    const log = fill(1, 7, true);
    log[addDaysToDateString(start, 2)] = day(addDaysToDateString(start, 2), false);
    const res = evaluateChallengeCycle(cycle(start), log, addDaysToDateString(start, 7));
    expect(res.outcome).toBe('active');
    expect(res.cycle.daysCompleted).toBe(6);
    expect(res.cycle.currentDay).toBe(8);
  });

  it('encerra com 2 faltas na mesma semana', () => {
    const log = fill(1, 7, true);
    log[addDaysToDateString(start, 1)] = day(addDaysToDateString(start, 1), false);
    log[addDaysToDateString(start, 4)] = day(addDaysToDateString(start, 4), false);
    const res = evaluateChallengeCycle(cycle(start), log, addDaysToDateString(start, 7));
    expect(res.outcome).toBe('failed');
    expect(res.failedWeek).toBe(1);
    expect(res.cycle.endDate).toBe(addDaysToDateString(start, 4));
  });

  it('faltas em semanas diferentes não somam', () => {
    const log = fill(1, 14, true);
    log[addDaysToDateString(start, 6)] = day(addDaysToDateString(start, 6), false); // dia 7 (semana 1)
    log[addDaysToDateString(start, 7)] = day(addDaysToDateString(start, 7), false); // dia 8 (semana 2)
    expect(evaluateChallengeCycle(cycle(start), log, addDaysToDateString(start, 14)).outcome).toBe('active');
  });

  it('Modo Elite não tolera faltas', () => {
    const log = fill(1, 3, true);
    log[addDaysToDateString(start, 1)] = day(addDaysToDateString(start, 1), false);
    expect(evaluateChallengeCycle(cycle(start, 66, true), log, addDaysToDateString(start, 3)).outcome).toBe('failed');
  });

  it('hoje (ainda aberto) nunca conta como falta', () => {
    const res = evaluateChallengeCycle(cycle(start), {}, start);
    expect(res.outcome).toBe('active');
    expect(res.cycle.currentDay).toBe(1);
  });

  it('só conclui DEPOIS do último dia — o último dia é jogado', () => {
    const log = fill(1, 21, true);
    expect(evaluateChallengeCycle(cycle(start, 21), log, addDaysToDateString(start, 20)).outcome).toBe('active');
    const done = evaluateChallengeCycle(cycle(start, 21), log, addDaysToDateString(start, 21));
    expect(done.outcome).toBe('completed');
    expect(done.cycle.daysCompleted).toBe(21);
    expect(done.cycle.endDate).toBe(addDaysToDateString(start, 20));
  });

  it('desafio agendado para o futuro fica aguardando', () => {
    const res = evaluateChallengeCycle(cycle(addDaysToDateString(start, 3)), {}, start);
    expect(res.outcome).toBe('active');
    expect(res.cycle.currentDay).toBe(0);
  });

  it('migração preserva dias já conquistados', () => {
    const legacyCycle = cycle(start);
    legacyCycle.checkIns = { 1: { dayNumber: 1, date: start, checked: true, xpEarned: 200, targetXp: 375 } };
    const log = buildDayLogFromLegacy({ activeChallenge: legacyCycle }, [mission('a', 100, [addDaysToDateString(start, 1)])], addDaysToDateString(start, 5));
    expect(log[start].completed).toBe(true);
    expect(log[addDaysToDateString(start, 1)].completed).toBe(true);
  });
});

describe('duelo', () => {
  const boss = { ...originalAdversaries[0] };

  it('dano não ultrapassa o HP e a reversão restaura exatamente', () => {
    const hit = applyDamageToAdversary(boss, boss.maxHp + 500);
    expect(hit.appliedDamage).toBe(boss.maxHp);
    expect(hit.isDefeatedNow).toBe(true);
    const list = [hit.updatedAdversary, { ...originalAdversaries[1] }];
    const reverted = revertDamageEntries(list, [
      { bossId: boss.id, amount: hit.appliedDamage, defeated: true, isCritical: false, isWeakness: false },
    ]);
    expect(reverted[0].currentHp).toBe(boss.maxHp);
    expect(reverted[0].isDefeated).toBe(false);
  });

  it('fraqueza e crítico aumentam o dano', () => {
    const normal = calculateDuelDamage(100, 'ninjutsu', boss, [], () => 0.9);
    const weak = calculateDuelDamage(100, boss.pillarWeakness, boss, [], () => 0.9);
    const crit = calculateDuelDamage(100, 'ninjutsu', boss, [], () => 0.01);
    expect(normal.totalDamage).toBe(100);
    expect(weak.totalDamage).toBe(135);
    expect(crit.totalDamage).toBe(150);
  });

  it('inventário deriva dos chefes derrotados e das compras', () => {
    const list = originalAdversaries.map((a, i) => ({ ...a, isDefeated: i === 0 }));
    const inv = deriveInventory(list, ['kunai_de_aco_polido']);
    expect(inv).toContain(originalAdversaries[0].rewardItem.id);
    expect(inv).toContain('kunai_de_aco_polido');
    expect(inv).not.toContain(originalAdversaries[5].rewardItem.id);
  });
});
