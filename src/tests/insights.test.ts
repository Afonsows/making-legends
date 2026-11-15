import { describe, it, expect } from 'vitest';
import { evaluateAchievements, nextAchievement } from '../core/achievements';
import { buildWeekSummary, getRecapWeek } from '../core/weeklySummary';
import { mergeMeasures, summarizeMeasure, activeMeasures } from '../core/measures';
import { createDefaultProfile } from '../state/useUserStore';
import { Measure, Mission, RewardGrant, UserProfile } from '../core/types';

// ── Fábricas ────────────────────────────────────────

const profileWith = (overrides: Partial<UserProfile> = {}): UserProfile => ({ ...createDefaultProfile(), ...overrides });

const day = (date: string, completed: boolean, xp = 100) => ({
  date,
  xpEarned: completed ? xp : 0,
  xpTarget: 200,
  completed,
  closed: true,
});

const grant = (key: string, date: string, xp: number, pillarId: RewardGrant['pillarId']): RewardGrant => ({
  key,
  date,
  label: key,
  xp,
  ryo: 0,
  pillarId,
  createdAt: `${date}T10:00:00.000Z`,
});

const measure = (id: string, goal: Measure['goal'], entries: Record<string, [number | null, string]>, extra: Partial<Measure> = {}): Measure => ({
  id,
  label: id,
  unit: 'kg',
  goal,
  entries: Object.fromEntries(Object.entries(entries).map(([date, [value, at]]) => [date, { value, at }])),
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...extra,
});

// ── Conquistas ──────────────────────────────────────

describe('conquistas', () => {
  it('perfil novo não tem nenhuma conquista', () => {
    const list = evaluateAchievements(profileWith());
    expect(list.every((a) => !a.unlocked)).toBe(true);
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
  });

  it('desbloqueia pelo recorde de sequência, mesmo que a sequência atual tenha caído', () => {
    const list = evaluateAchievements(profileWith({ bestStreak: 8, currentStreak: 1 }));
    const byId = Object.fromEntries(list.map((a) => [a.id, a]));
    expect(byId.streak_3.unlocked).toBe(true);
    expect(byId.streak_7.unlocked).toBe(true);
    expect(byId.streak_14.unlocked).toBe(false);
    expect(byId.streak_14.current).toBe(8);
  });

  it('conta desafios concluídos do histórico e personalizados', () => {
    const cycle = {
      id: 'c1',
      cycleNumber: 1,
      targetDays: 66,
      isEliteMode: true,
      startDate: '2026-08-01',
      status: 'completed' as const,
      currentDay: 66,
      daysCompleted: 60,
      checkIns: {},
      totalXpEarned: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const custom = {
      id: 'x',
      title: 'x',
      targetDays: 30,
      startDate: '2026-09-01',
      status: 'completed' as const,
      habits: [],
      createdAt: '2026-09-01T00:00:00.000Z',
    };
    const byId = Object.fromEntries(evaluateAchievements(profileWith({ challengeHistory: [cycle] }), [custom]).map((a) => [a.id, a]));
    expect(byId.challenge_1.unlocked).toBe(true);
    expect(byId.challenge_3.current).toBe(2);
    expect(byId.challenge_66.unlocked).toBe(true);
    expect(byId.challenge_elite.unlocked).toBe(true);
  });

  it('sugere como próximo marco o mais adiantado', () => {
    const list = evaluateAchievements(profileWith({ bestStreak: 2, missionsCompletedTotal: 10 }));
    expect(nextAchievement(list)?.id).toBe('streak_3');
  });
});

// ── Resumo semanal ──────────────────────────────────

describe('resumo semanal', () => {
  // 2026-11-09 é segunda-feira; 2026-11-15 é domingo
  const profile = profileWith({
    dayLog: {
      '2026-11-02': day('2026-11-02', true),
      '2026-11-03': day('2026-11-03', true),
      '2026-11-09': day('2026-11-09', true),
      '2026-11-10': day('2026-11-10', false),
      '2026-11-11': day('2026-11-11', true),
      '2026-11-12': day('2026-11-12', false),
    },
    shieldedDates: ['2026-11-10'],
    grants: {
      a: grant('a', '2026-11-03', 100, 'taijutsu'),
      b: grant('b', '2026-11-09', 150, 'ninjutsu'),
      c: grant('c', '2026-11-11', 50, 'taijutsu'),
      d: grant('d', '2026-11-11', 100, 'ninjutsu'),
    },
  });
  const missions = [{ completedDates: ['2026-11-09', '2026-11-11', '2026-11-03'] }] as Mission[];

  it('soma dias, XP e missões da semana e compara com a anterior', () => {
    const week = buildWeekSummary(profile, missions, '2026-11-13', '2026-11-13', { completed: true });
    expect(week.weekStart).toBe('2026-11-09');
    expect(week.weekEnd).toBe('2026-11-15');
    expect(week.daysCompleted).toBe(3); // 9, 11 e hoje (13)
    expect(week.xp).toBe(300);
    expect(week.missionsDone).toBe(2);
    expect(week.previous).toEqual({ daysCompleted: 2, xp: 100, missionsDone: 1 });
    expect(week.xpChangePct).toBe(200);
    expect(week.topPillar).toEqual({ id: 'ninjutsu', xp: 250 });
    expect(week.daysElapsed).toBe(5);
    expect(week.isClosed).toBe(false);
  });

  it('classifica cada dia: cumprido, escudo, perdido, hoje e futuro', () => {
    const week = buildWeekSummary(profile, missions, '2026-11-13', '2026-11-13', { completed: false });
    expect(week.days.map((d) => d.state)).toEqual(['done', 'shield', 'done', 'missed', 'today', 'future', 'future']);
  });

  it('semana sem XP anterior não tem variação percentual', () => {
    const week = buildWeekSummary(profileWith(), [], '2026-11-13', '2026-11-13');
    expect(week.xpChangePct).toBeNull();
    expect(week.topPillar).toBeNull();
  });

  it('destaca a semana no domingo (fechando) e na segunda (fechada)', () => {
    expect(getRecapWeek('2026-11-15')).toEqual({ dateInWeek: '2026-11-15', kind: 'closing' });
    expect(getRecapWeek('2026-11-16')).toEqual({ dateInWeek: '2026-11-15', kind: 'closed' });
    expect(getRecapWeek('2026-11-18')).toBeNull();
  });
});

// ── Antes e depois ──────────────────────────────────

describe('medidas (antes e depois)', () => {
  it('compara o primeiro e o último registro na direção desejada', () => {
    const peso = measure('peso', 'down', {
      '2026-11-01': [82, '2026-11-01T08:00:00.000Z'],
      '2026-11-10': [80.5, '2026-11-10T08:00:00.000Z'],
    });
    const summary = summarizeMeasure(peso);
    expect(summary.first?.value).toBe(82);
    expect(summary.last?.value).toBe(80.5);
    expect(summary.delta).toBe(-1.5);
    expect(summary.improved).toBe(true);
    expect(summarizeMeasure({ ...peso, goal: 'up' }).improved).toBe(false);
  });

  it('com um registro só não há antes e depois', () => {
    const summary = summarizeMeasure(measure('agua', 'up', { '2026-11-01': [1, '2026-11-01T08:00:00.000Z'] }));
    expect(summary.delta).toBe(0);
    expect(summary.improved).toBeNull();
  });

  it('mescla aparelhos: vence o registro mais recente e a remoção viaja junto', () => {
    const phone = {
      peso: measure('peso', 'down', {
        '2026-11-01': [82, '2026-11-01T08:00:00.000Z'],
        '2026-11-05': [null, '2026-11-06T09:00:00.000Z'], // removido no celular
      }),
    };
    const desktop = {
      peso: measure(
        'peso',
        'down',
        {
          '2026-11-01': [81, '2026-11-02T08:00:00.000Z'], // corrigido depois
          '2026-11-05': [80, '2026-11-05T08:00:00.000Z'],
        },
        { label: 'Peso corporal', updatedAt: '2026-11-03T00:00:00.000Z' }
      ),
      sono: measure('sono', 'up', { '2026-11-01': [6, '2026-11-01T08:00:00.000Z'] }),
    };

    const merged = mergeMeasures(phone, desktop)!;
    expect(merged.peso.label).toBe('Peso corporal');
    expect(merged.peso.entries['2026-11-01'].value).toBe(81);
    expect(merged.peso.entries['2026-11-05'].value).toBeNull();
    expect(summarizeMeasure(merged.peso).points).toEqual([{ date: '2026-11-01', value: 81 }]);
    expect(Object.keys(merged)).toEqual(['peso', 'sono']);

    // Idempotente e simétrica
    expect(mergeMeasures(merged, phone)).toEqual(merged);
    expect(mergeMeasures(desktop, phone)).toEqual(merged);
  });

  it('medida excluída some da lista e não volta com dados antigos de outro aparelho', () => {
    const deleted = { peso: measure('peso', 'down', {}, { deletedAt: '2026-11-08T00:00:00.000Z' }) };
    const stale = { peso: measure('peso', 'down', { '2026-11-01': [82, '2026-11-01T08:00:00.000Z'] }) };
    const merged = mergeMeasures(stale, deleted)!;
    expect(merged.peso.deletedAt).toBe('2026-11-08T00:00:00.000Z');
    expect(activeMeasures(merged)).toEqual([]);
    expect(mergeMeasures(undefined, undefined)).toBeUndefined();
  });
});
