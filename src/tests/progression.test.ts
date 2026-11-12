import { describe, it, expect } from 'vitest';
import {
  addGrant,
  removeGrant,
  deriveTotals,
  mergeLedgers,
  compactLedger,
  buildLegacyBase,
  getLevelUpRyoTotal,
  LedgerState,
  LEGACY_BASE_KEY,
} from '../core/ledger';
import { settleDay, settleDayLog, recomputeDay, mergeDayRecords, mergeDayLogs } from '../core/dayLog';
import { allocateShields } from '../core/streak';
import { evaluateChallengeCycle, getCycleGraceBefore, ABANDONED_REASON } from '../core/cycle';
import { reconcileProgression, ProgressionState } from '../core/progression';
import { mergeSnapshots, mergeMissions, stableStringify, SyncSnapshot } from '../core/syncMerge';
import { getLevelFromTotalXp } from '../core/xpEngine';
import { addDaysToDateString } from '../core/dateUtils';
import { DayRecord, Mission, ProtocolChallengeCycle, RewardGrant, UserProfile } from '../core/types';

// ── Fábricas ─────────────────────────────────────────────────

const grant = (key: string, xp: number, ryo: number, at: string, extra: Partial<RewardGrant> = {}): RewardGrant => ({
  key,
  date: at.slice(0, 10),
  label: key,
  xp,
  ryo,
  pillarId: 'chakra',
  createdAt: at,
  ...extra,
});

const emptyLedger = (): LedgerState => ({ grants: {}, revoked: {} });

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
  createdAt: '2026-11-01T10:00:00.000Z',
});

const day = (date: string, completed: boolean, closed = true): DayRecord => ({
  date,
  xpEarned: completed ? 200 : 0,
  xpTarget: 300,
  completed,
  closed,
});

const cycle = (startDate: string, extra: Partial<ProtocolChallengeCycle> = {}): ProtocolChallengeCycle => ({
  id: 'c1',
  cycleNumber: 1,
  startDate,
  targetDays: 66,
  isEliteMode: false,
  status: 'active',
  currentDay: 1,
  daysCompleted: 0,
  checkIns: {},
  totalXpEarned: 0,
  createdAt: '',
  ...extra,
});

const shield = { isEliteMode: false, equippedItems: [], extraShieldWeeks: [] };

const profile = (extra: Partial<UserProfile> = {}): UserProfile =>
  ({
    id: 'user-1',
    name: 'Shinobi',
    gender: 'male',
    avatarConfig: { silhouette: 'shadow', outfit: 'tunic_dark', headband: 'iron_slate', auraColor: 'chakra' },
    notificationSettings: { morningTime: '07:30', eveningTime: '21:00', enabled: false, soundEnabled: true },
    subscriptionStatus: 'trial',
    hasCompletedOnboarding: true,
    isHardModeEnabled: false,
    equippedItems: [],
    inventory: [],
    unlockedCards: [],
    challengeHistory: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-11-10T08:00:00.000Z',
    lastActiveDate: '2026-11-12',
    dayLog: {},
    shieldedDates: [],
    grants: {},
    revoked: {},
    deletedMissions: {},
    deletedCycles: {},
    purchasedItems: [],
    extraShieldWeeks: [],
    soldierPillDates: [],
    bossesDefeated: 0,
    missionsCompletedTotal: 0,
    bestStreak: 0,
    currentStreak: 0,
    currentProtocolDay: 0,
    weeklyShieldsRemaining: 1,
    weeklyShieldsMax: 1,
    ...deriveTotals(extra.grants || {}),
    ...extra,
  }) as UserProfile;

const snapshot = (p: UserProfile, missions: Mission[] = []): SyncSnapshot => ({ profile: p, missions, challenges: [], bossHp: {} });

// ─────────────────────────────────────────────────────────────

describe('livro-razão: XP e Ryō sempre derivados', () => {
  it('conceder e estornar devolve exatamente o estado anterior', () => {
    let ledger = addGrant(emptyLedger(), grant('mission:a:2026-11-10', 140, 130, '2026-11-10T09:00:00.000Z'));
    const before = deriveTotals(ledger.grants);
    ledger = addGrant(ledger, grant('mission:b:2026-11-10', 5000, 400, '2026-11-10T10:00:00.000Z'));
    expect(deriveTotals(ledger.grants).level).toBeGreaterThan(before.level);
    ledger = removeGrant(ledger, 'mission:b:2026-11-10', '2026-11-10T11:00:00.000Z');
    // Inclui o Ryō de promoção dos níveis perdidos — nada "sobra"
    expect(deriveTotals(ledger.grants)).toEqual(before);
  });

  it('a mesma chave nunca paga duas vezes', () => {
    const g = grant('checkin:2026-11-10', 0, 40, '2026-11-10T09:00:00.000Z', { pillarId: undefined });
    const once = addGrant(emptyLedger(), g);
    expect(addGrant(once, { ...g, ryo: 999 })).toBe(once);
  });

  it('compras são lançamentos negativos e o saldo nunca fica incoerente', () => {
    let ledger = addGrant(emptyLedger(), grant('mission:a:2026-11-10', 0, 3000, '2026-11-10T09:00:00.000Z'));
    ledger = addGrant(ledger, grant('shop:item:kunai', 0, -2500, '2026-11-10T10:00:00.000Z', { pillarId: undefined }));
    expect(deriveTotals(ledger.grants).ryo).toBe(500);
  });

  it('migração: o saldo inicial reproduz exatamente os totais do sistema antigo', () => {
    const recent = { 'mission:a:2026-11-10': grant('mission:a:2026-11-10', 140, 130, '2026-11-10T09:00:00.000Z') };
    const totals = { totalXp: 4321, ryo: 987, pillarXp: { chakra: 2000, taijutsu: 2321 } };
    const base = buildLegacyBase(totals, recent, '2026-11-12T00:00:00.000Z');
    const derived = deriveTotals({ ...recent, [LEGACY_BASE_KEY]: base });
    expect(derived.totalXp).toBe(4321);
    expect(derived.ryo).toBe(987);
    expect(derived.pillarXp.chakra).toBe(2000);
    expect(derived.pillarXp.taijutsu).toBe(2321);
    expect(base.ryo + 130 + getLevelUpRyoTotal(getLevelFromTotalXp(4321))).toBe(987);
  });

  it('resumir dias antigos não altera nenhum total', () => {
    const grants = {
      a: grant('mission:a:2026-05-01', 100, 50, '2026-05-01T09:00:00.000Z', { pillarId: 'taijutsu' }),
      b: grant('tool:meal:2026-05-01:1', 10, 8, '2026-05-01T12:00:00.000Z', { pillarId: 'taijutsu' }),
      c: grant('boss:b1', 0, 70, '2026-05-01T13:00:00.000Z', { pillarId: undefined }),
      d: grant('mission:a:2026-11-10', 100, 50, '2026-11-10T09:00:00.000Z'),
    };
    const ledger = Object.fromEntries(Object.values(grants).map((g) => [g.key, g]));
    const compact = compactLedger(ledger, '2026-08-01');
    expect(deriveTotals(compact)).toEqual(deriveTotals(ledger));
    expect(Object.keys(compact).sort()).toEqual(['boss:b1', 'day:2026-05-01', 'mission:a:2026-11-10']);
    expect(compactLedger(compact, '2026-08-01')).toBe(compact);
  });
});

describe('livro-razão: mesclagem entre aparelhos', () => {
  const phone = addGrant(emptyLedger(), grant('mission:a:2026-11-10', 100, 50, '2026-11-10T08:00:00.000Z'));
  const pc = addGrant(emptyLedger(), grant('mission:b:2026-11-10', 85, 70, '2026-11-10T20:00:00.000Z'));

  it('soma o que cada aparelho ganhou, em qualquer ordem', () => {
    const ab = mergeLedgers(phone, pc);
    const ba = mergeLedgers(pc, phone);
    expect(deriveTotals(ab.grants).totalXp).toBe(185);
    expect(stableStringify(ab)).toBe(stableStringify(ba));
    // Idempotente: mesclar de novo não muda nada
    expect(stableStringify(mergeLedgers(ab, pc))).toBe(stableStringify(ab));
  });

  it('missão desmarcada em um aparelho some também no outro', () => {
    const unticked = removeGrant(phone, 'mission:a:2026-11-10', '2026-11-10T09:00:00.000Z');
    const merged = mergeLedgers(phone, unticked);
    expect(merged.grants['mission:a:2026-11-10']).toBeUndefined();
    expect(deriveTotals(merged.grants).totalXp).toBe(0);
  });

  it('marcar de novo depois de desmarcar prevalece sobre o estorno antigo', () => {
    const unticked = removeGrant(phone, 'mission:a:2026-11-10', '2026-11-10T09:00:00.000Z');
    const again = addGrant(unticked, grant('mission:a:2026-11-10', 100, 50, '2026-11-10T08:30:00.000Z'));
    // O relógio "atrasado" do novo lançamento é corrigido para depois do estorno
    expect(again.grants['mission:a:2026-11-10'].createdAt > unticked.revoked['mission:a:2026-11-10']).toBe(true);
    expect(mergeLedgers(phone, again).grants['mission:a:2026-11-10']).toBeDefined();
  });

  it('dia resumido em um aparelho não é contado em dobro no outro', () => {
    const detailed: LedgerState = {
      grants: { 'mission:a:2026-05-01': grant('mission:a:2026-05-01', 100, 50, '2026-05-01T09:00:00.000Z') },
      revoked: {},
    };
    const compacted: LedgerState = { grants: compactLedger(detailed.grants, '2026-08-01'), revoked: {} };
    expect(deriveTotals(mergeLedgers(detailed, compacted).grants).totalXp).toBe(100);
  });
});

describe('registro diário: fatos, não o momento em que o app abriu', () => {
  const today = '2026-11-12';

  it('um dia fechado como cumprido nunca vira falta por dados atrasados', () => {
    const done = settleDay(undefined, [mission('a', 100, ['2026-11-10']), mission('b', 100)], '2026-11-10', today);
    expect(done.completed).toBe(true);
    // Aparelho atrasado: mesmas missões, mas sem a marcação
    const stale = settleDay(done, [mission('a', 100), mission('b', 100)], '2026-11-10', today);
    expect(stale).toBe(done);
  });

  it('um dia fechado como falta se corrige quando a marcação chega', () => {
    const missed = settleDay(undefined, [mission('a', 100), mission('b', 100)], '2026-11-10', today);
    expect(missed).toMatchObject({ completed: false, closed: true });
    const fixed = settleDay(missed, [mission('a', 100, ['2026-11-10']), mission('b', 100)], '2026-11-10', today);
    expect(fixed.completed).toBe(true);
  });

  it('o dia de hoje reflete exatamente as missões (pode subir e descer)', () => {
    const up = settleDay(undefined, [mission('a', 100, [today])], today, today);
    expect(up).toMatchObject({ completed: true, closed: false });
    expect(settleDay(up, [mission('a', 100)], today, today).completed).toBe(false);
  });

  it('preenche dias sem registro e é idempotente', () => {
    const ms = [mission('a', 100, ['2026-11-09']), mission('b', 100)];
    const first = settleDayLog({ '2026-11-08': day('2026-11-08', true) }, ms, today);
    expect(Object.keys(first.dayLog).sort()).toEqual(['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', today]);
    expect(first.dayLog['2026-11-09'].completed).toBe(true);
    expect(first.dayLog['2026-11-10'].completed).toBe(false);
    const second = settleDayLog(first.dayLog, ms, today);
    expect(second.changedDates).toEqual([]);
    expect(second.dayLog).toBe(first.dayLog);
  });

  it('com a nuvem pendente só o dia de hoje é atualizado', () => {
    const ms = [mission('a', 100, [today])];
    const res = settleDayLog({ '2026-11-08': day('2026-11-08', true) }, ms, today, { closePast: false });
    expect(Object.keys(res.dayLog).sort()).toEqual(['2026-11-08', today]);
  });

  it('mesclagem: cumprido vence falta; correção manual mais recente vence tudo', () => {
    const merged = mergeDayRecords(day('2026-11-10', false), day('2026-11-10', true));
    expect(merged?.completed).toBe(true);
    const log = mergeDayLogs({ '2026-11-10': day('2026-11-10', true) }, { '2026-11-11': day('2026-11-11', false) });
    expect(Object.keys(log).sort()).toEqual(['2026-11-10', '2026-11-11']);

    const edited = recomputeDay(day('2026-11-10', true), [mission('a', 100)], '2026-11-10', '2026-11-12T10:00:00.000Z');
    expect(edited.completed).toBe(false);
    expect(mergeDayRecords(day('2026-11-10', true), edited)).toBe(edited);
  });
});

describe('desafio: o dia de criação nunca conta como falta', () => {
  const start = '2026-11-09';

  it('cenário real: criado no dia 9, cumpriu o dia 10, faltou no dia 11 → segue ativo', () => {
    const c = cycle(start, { createdAt: new Date(2026, 10, 9, 22, 30).toISOString() });
    const log = {
      [start]: day(start, false),
      '2026-11-10': day('2026-11-10', true),
      '2026-11-11': day('2026-11-11', false),
    };
    const res = evaluateChallengeCycle(c, log, '2026-11-12');
    expect(res.outcome).toBe('active');
    expect(res.missesByWeek[1]).toBe(1);
    expect(getCycleGraceBefore(c)).toBe('2026-11-10');
  });

  it('duas faltas reais na mesma semana continuam encerrando o ciclo', () => {
    const c = cycle(start, { createdOn: start });
    const log = {
      [start]: day(start, true),
      '2026-11-10': day('2026-11-10', false),
      '2026-11-11': day('2026-11-11', false),
    };
    const res = evaluateChallengeCycle(c, log, '2026-11-12');
    expect(res.outcome).toBe('failed');
    expect(res.cycle.endedBy).toBe('rule');
    expect(res.cycle.failedReason).toBe('2 faltas na Semana 1');
  });

  it('desafio agendado: o primeiro dia já vale (não foi criado nele)', () => {
    const c = cycle(start, { createdOn: '2026-11-07', isEliteMode: true });
    expect(getCycleGraceBefore(c)).toBeUndefined();
    expect(evaluateChallengeCycle(c, { [start]: day(start, false) }, '2026-11-10').outcome).toBe('failed');
  });

  it('avaliar duas vezes os mesmos dados dá o mesmo resultado', () => {
    const c = cycle(start, { createdOn: start });
    const log = { [start]: day(start, true), '2026-11-10': day('2026-11-10', true) };
    const once = evaluateChallengeCycle(c, log, '2026-11-11');
    const twice = evaluateChallengeCycle(once.cycle, log, '2026-11-11');
    expect(stableStringify(twice.cycle)).toBe(stableStringify(once.cycle));
  });
});

describe('reconciliação única da progressão', () => {
  const today = '2026-11-12';
  const start = '2026-11-09';
  const fullMissions = [mission('a', 100, [start, '2026-11-10']), mission('b', 100)];
  const staleMissions = [mission('a', 100, [start]), mission('b', 100)];
  const base = (extra: Partial<ProgressionState> = {}): ProgressionState => ({
    dayLog: { [start]: day(start, true) },
    shieldedDates: [],
    shieldsThrough: '2026-11-09',
    activeChallenge: cycle(start, { createdOn: '2026-11-08' }),
    challengeHistory: [],
    bestStreak: 0,
    ...extra,
  });

  it('é idempotente', () => {
    const first = reconcileProgression(base(), { today, missions: fullMissions, shield });
    const second = reconcileProgression(first, { today, missions: fullMissions, shield });
    expect(second.events).toEqual([]);
    expect(second.dayLog).toBe(first.dayLog);
    expect(stableStringify(second.activeChallenge)).toBe(stableStringify(first.activeChallenge));
  });

  it('enquanto a nuvem não chega, nada é fechado nem encerrado', () => {
    const res = reconcileProgression(base(), { today, missions: staleMissions, shield, settlePast: false });
    expect(res.events).toEqual([]);
    expect(res.activeChallenge?.status).toBe('active');
    expect(res.dayLog['2026-11-10']).toBeUndefined();
  });

  it('autocorreção: ciclo encerrado com dados atrasados volta quando os dados chegam', () => {
    // 1. Aparelho atrasado fecha os dias 10 e 11 como faltas → encerra o ciclo
    const stale = reconcileProgression(base(), { today, missions: staleMissions, shield });
    expect(stale.events.map((e) => e.type)).toContain('cycle_failed');
    expect(stale.activeChallenge).toBeUndefined();
    expect(stale.challengeHistory[0].failedReason).toBe('2 faltas na Semana 1');

    // 2. Chega a marcação do dia 10 (feita no outro aparelho)
    const healed = reconcileProgression(stale, { today, missions: fullMissions, shield });
    // (o escudo que tinha sido gasto no dia 10 é devolvido e passa a cobrir o dia 11)
    expect(healed.events.map((e) => e.type)).toContain('cycle_restored');
    expect(healed.shieldedDates).toEqual(['2026-11-11']);
    expect(healed.activeChallenge?.status).toBe('active');
    expect(healed.activeChallenge?.daysCompleted).toBe(2);
    expect(healed.challengeHistory).toEqual([]);
    expect(healed.dayLog['2026-11-10'].completed).toBe(true);
  });

  it('ciclo encerrado pelo próprio shinobi nunca volta sozinho', () => {
    const abandoned = cycle(start, { status: 'failed', endedBy: 'user', failedReason: ABANDONED_REASON, createdOn: '2026-11-08' });
    const res = reconcileProgression(base({ activeChallenge: undefined, challengeHistory: [abandoned] }), {
      today,
      missions: [mission('a', 100, [start, '2026-11-10', '2026-11-11']), mission('b', 100)],
      shield,
    });
    expect(res.activeChallenge).toBeUndefined();
    expect(res.events).toEqual([]);
  });

  it('escudo gasto em um dia que depois se revelou cumprido é devolvido', () => {
    const log = {
      '2026-11-09': day('2026-11-09', true),
      '2026-11-10': day('2026-11-10', true), // corrigido pela sincronização
      '2026-11-11': day('2026-11-11', false),
    };
    const res = allocateShields(log, ['2026-11-10'], '2026-11-11', today, shield);
    expect(res.shieldedDates).toEqual(['2026-11-11']);
    expect(res.newlyShielded).toEqual(['2026-11-11']);
  });
});

describe('sincronização: mesclar em vez de sobrescrever', () => {
  const start = '2026-11-09';
  const g = (key: string, at: string) => grant(key, 100, 50, at);

  it('PC atrasado + celular em dia → o dia cumprido e o ciclo sobrevivem', () => {
    // PC: abriu depois, fechou o dia 10 como falta e encerrou o ciclo (e é o lado "mais recente")
    const pc = snapshot(
      profile({
        updatedAt: '2026-11-12T09:00:00.000Z',
        dayLog: { [start]: day(start, true), '2026-11-10': day('2026-11-10', false), '2026-11-11': day('2026-11-11', false) },
        challengeHistory: [cycle(start, { status: 'failed', endedBy: 'rule', failedReason: '2 faltas na Semana 1' })],
        grants: { [`mission:a:${start}`]: g(`mission:a:${start}`, '2026-11-09T10:00:00.000Z') },
      }),
      [mission('a', 100, [start])]
    );
    // Celular: cumpriu o dia 10
    const phone = snapshot(
      profile({
        updatedAt: '2026-11-10T21:00:00.000Z',
        dayLog: { [start]: day(start, true), '2026-11-10': day('2026-11-10', true, false) },
        activeChallenge: cycle(start),
        grants: {
          [`mission:a:${start}`]: g(`mission:a:${start}`, '2026-11-09T10:00:00.000Z'),
          'mission:a:2026-11-10': g('mission:a:2026-11-10', '2026-11-10T20:00:00.000Z'),
        },
      }),
      [mission('a', 100, [start, '2026-11-10'])]
    );

    const merged = mergeSnapshots(pc, phone);
    expect(merged.profile.dayLog['2026-11-10'].completed).toBe(true);
    expect(merged.profile.activeChallenge?.status).toBe('active');
    expect(merged.profile.challengeHistory).toEqual([]);
    expect(merged.missions[0].completedDates).toEqual([start, '2026-11-10']);
    expect(merged.profile.totalXp).toBe(200);

    // E a reconciliação confirma: 1 falta só (dia 11) → ciclo ativo
    const result = reconcileProgression(
      {
        dayLog: merged.profile.dayLog,
        shieldedDates: merged.profile.shieldedDates,
        activeChallenge: merged.profile.activeChallenge,
        challengeHistory: merged.profile.challengeHistory || [],
        bestStreak: 0,
      },
      { today: '2026-11-12', missions: merged.missions, shield }
    );
    expect(result.activeChallenge?.status).toBe('active');
    expect(result.events.filter((e) => e.type === 'cycle_failed')).toEqual([]);
  });

  it('é idempotente — o resultado mesclado não muda ao mesclar de novo com qualquer lado', () => {
    const a = snapshot(
      profile({ updatedAt: '2026-11-12T09:00:00.000Z', grants: { 'mission:a:2026-11-11': g('mission:a:2026-11-11', '2026-11-11T10:00:00.000Z') } }),
      [mission('a', 100, ['2026-11-11'])]
    );
    const b = snapshot(
      profile({ updatedAt: '2026-11-11T09:00:00.000Z', grants: { 'mission:b:2026-11-11': g('mission:b:2026-11-11', '2026-11-11T12:00:00.000Z') } }),
      [mission('a', 100), mission('b', 100, ['2026-11-11'])]
    );
    const merged = mergeSnapshots(a, b, { now: '2026-11-12T10:00:00.000Z' });
    expect(merged.profile.totalXp).toBe(200);
    expect(merged.missions.map((m) => m.id)).toEqual(['a', 'b']);
    const againWithB = mergeSnapshots(merged, b, { now: '2026-11-12T11:00:00.000Z' });
    const againWithA = mergeSnapshots(merged, a, { now: '2026-11-12T11:00:00.000Z' });
    expect(stableStringify(againWithB)).toBe(stableStringify(merged));
    expect(stableStringify(againWithA)).toBe(stableStringify(merged));
  });

  it('missão desmarcada em um aparelho não "ressuscita" pela união de datas', () => {
    const key = 'mission:a:2026-11-12';
    const ticked = snapshot(profile({ grants: { [key]: g(key, '2026-11-12T08:00:00.000Z') } }), [mission('a', 100, ['2026-11-12'])]);
    const unticked = snapshot(
      profile({ updatedAt: '2026-11-12T09:00:00.000Z', revoked: { [key]: '2026-11-12T09:00:00.000Z' } }),
      [mission('a', 100)]
    );
    const merged = mergeSnapshots(ticked, unticked);
    expect(merged.missions[0].completedDates).toEqual([]);
    expect(merged.profile.totalXp).toBe(0);
  });

  it('exclusão de missão viaja como lápide; recriar depois a traz de volta', () => {
    const ledger = emptyLedger();
    const withA = [mission('a', 100), mission('b', 100)];
    const deleted = { a: '2026-11-12T09:00:00.000Z' };
    expect(mergeMissions([mission('b', 100)], withA, false, ledger, deleted).missions.map((m) => m.id)).toEqual(['b']);
    const recreated = { ...mission('a', 100), createdAt: '2026-11-12T10:00:00.000Z' };
    expect(mergeMissions([recreated, mission('b', 100)], withA, false, ledger, deleted).missions.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('primeira sincronização após a migração: vale a lista do lado mais recente', () => {
    const res = mergeMissions([mission('a', 100)], [mission('a', 100), mission('old', 50)], false, emptyLedger(), {}, {
      missionList: 'primary',
      now: '2026-11-12T10:00:00.000Z',
    });
    expect(res.missions.map((m) => m.id)).toEqual(['a']);
    expect(res.deletedMissions.old).toBe('2026-11-12T10:00:00.000Z');
  });

  it('reset completo mais recente vence por inteiro', () => {
    const reset = snapshot(profile({ resetEpoch: '2026-11-12T09:00:00.000Z', updatedAt: '2026-11-12T09:00:00.000Z' }), [mission('a', 100)]);
    const old = snapshot(profile({ updatedAt: '2026-11-12T10:00:00.000Z', grants: { x: g('mission:a:2026-11-01', '2026-11-01T10:00:00.000Z') } }), [
      mission('a', 100, ['2026-11-01']),
    ]);
    expect(mergeSnapshots(reset, old)).toBe(reset);
    expect(mergeSnapshots(old, reset)).toBe(reset);
  });

  it('dias apagados ao excluir um desafio não voltam pelo outro aparelho', () => {
    const wipe = { from: start, at: '2026-11-12T09:00:00.000Z' };
    const wiped = snapshot(profile({ dayWipe: wipe, updatedAt: '2026-11-12T09:00:00.000Z', dayLog: { '2026-11-08': day('2026-11-08', true) } }));
    const other = snapshot(
      profile({ dayLog: { '2026-11-08': day('2026-11-08', true), [start]: day(start, true) }, shieldedDates: ['2026-11-10'] })
    );
    const merged = mergeSnapshots(wiped, other);
    expect(Object.keys(merged.profile.dayLog)).toEqual(['2026-11-08']);
    expect(merged.profile.shieldedDates).toEqual([]);
  });

  it('dois desafios ativos criados em aparelhos diferentes: fica o mais novo', () => {
    const a = snapshot(profile({ activeChallenge: cycle(start, { id: 'old', createdAt: '2026-11-09T10:00:00.000Z' }) }));
    const b = snapshot(
      profile({ activeChallenge: cycle(addDaysToDateString(start, 2), { id: 'new', createdAt: '2026-11-11T10:00:00.000Z' }) })
    );
    const merged = mergeSnapshots(a, b, { now: '2026-11-12T10:00:00.000Z' });
    expect(merged.profile.activeChallenge?.id).toBe('new');
    expect(merged.profile.challengeHistory?.[0]).toMatchObject({ id: 'old', status: 'failed', endedBy: 'user' });
  });
});
