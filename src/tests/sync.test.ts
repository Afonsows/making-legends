import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Testes de ponta a ponta da sincronização com um Supabase em memória.
 * Dois "aparelhos" são simulados salvando e restaurando o estado dos stores.
 */

const cloud = vi.hoisted(() => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (memory.has(k) ? memory.get(k)! : null),
    setItem: (k: string, v: string) => void memory.set(k, String(v)),
    removeItem: (k: string) => void memory.delete(k),
    clear: () => memory.clear(),
    key: (i: number) => Array.from(memory.keys())[i] ?? null,
    get length() {
      return memory.size;
    },
  } as Storage;
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true });

  type Row = Record<string, unknown>;
  const tables: Record<string, Map<string, Row>> = { profiles: new Map(), missions: new Map() };
  const stats = { writes: 0 };
  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

  const from = (table: string) => {
    const q: { op: 'select' | 'upsert' | 'delete'; filters: [string, unknown][]; payload?: Row | Row[]; inList?: [string, unknown[]] } = {
      op: 'select',
      filters: [],
    };
    const matches = (row: Row) =>
      q.filters.every(([col, val]) => row[col] === val) && (!q.inList || q.inList[1].includes(row[q.inList[0]]));
    const run = (single: boolean) => {
      const rows = tables[table];
      if (q.op === 'upsert') {
        stats.writes++;
        (Array.isArray(q.payload) ? q.payload : [q.payload!]).forEach((row) => {
          const id = row.id as string;
          rows.set(id, clone({ created_at: '2026-11-01T00:00:00+00:00', ...(rows.get(id) || {}), ...row }));
        });
        return { data: null, error: null };
      }
      if (q.op === 'delete') {
        stats.writes++;
        Array.from(rows.entries()).forEach(([id, row]) => matches(row) && rows.delete(id));
        return { data: null, error: null };
      }
      const found = Array.from(rows.values())
        .filter(matches)
        .map(clone)
        .sort((a, b) => Number(a.mission_order || 0) - Number(b.mission_order || 0));
      return { data: single ? found[0] || null : found, error: null };
    };
    const builder = {
      select: () => builder,
      upsert: (payload: Row | Row[]) => ((q.op = 'upsert'), (q.payload = payload), builder),
      delete: () => ((q.op = 'delete'), builder),
      eq: (col: string, val: unknown) => (q.filters.push([col, val]), builder),
      in: (col: string, vals: unknown[]) => ((q.inList = [col, vals]), builder),
      order: () => builder,
      maybeSingle: () => Promise.resolve(run(true)),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run(false)).then(resolve, reject),
    };
    return builder;
  };

  return { tables, stats, from, storage };
});

vi.mock('../services/supabase', () => ({ supabase: { from: cloud.from } }));
vi.mock('../utils/confetti', () => ({
  triggerMissionConfetti: () => undefined,
  triggerLevelUpConfetti: () => undefined,
  triggerBossDefeatedConfetti: () => undefined,
  triggerDayCompleteConfetti: () => undefined,
  triggerChallengeCompleteConfetti: () => undefined,
}));

import { syncService } from '../services/syncService';
import { useUserStore, createDefaultProfile } from '../state/useUserStore';
import { useHabitStore, initialMissions } from '../state/useHabitStore';
import { useDuelStore } from '../state/useDuelStore';
import { useChallengeStore } from '../state/useChallengeStore';
import { originalAdversaries } from '../core/adversariesData';
import { deriveTotals } from '../core/ledger';
import { Mission, UserProfile, Adversary, UserChallenge } from '../core/types';

const USER = 'user-1';
const META = 'ml_sync_meta_v3';

interface Device {
  profile: UserProfile;
  missions: Mission[];
  challenges: UserChallenge[];
  adversaries: Adversary[];
  meta: string | null;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const freshDevice = (onboarded = true): Device => ({
  profile: { ...createDefaultProfile(), hasCompletedOnboarding: onboarded },
  // (data de criação fixa: os testes "viajam" para antes do relógio real)
  missions: initialMissions.map((m) => ({ ...m, completedDates: [], isCompletedToday: false, createdAt: '2026-11-01T00:00:00.000Z' })),
  challenges: [],
  adversaries: originalAdversaries.map((a) => ({ ...a })),
  meta: null,
});

const capture = (): Device =>
  clone({
    profile: useUserStore.getState().profile,
    missions: useHabitStore.getState().missions,
    challenges: useChallengeStore.getState().challenges,
    adversaries: useDuelStore.getState().adversaries,
    meta: cloud.storage.getItem(META),
  });

const load = (device: Device) => {
  const d = clone(device);
  useUserStore.setState({
    profile: d.profile,
    cloudGate: 'open',
    activeLevelUpModal: null,
    activeResetModal: null,
    activeCompletionModal: null,
    toasts: [],
  });
  useHabitStore.setState({ missions: d.missions, missionLogs: [] });
  useChallengeStore.setState({ challenges: d.challenges });
  useDuelStore.setState({ adversaries: d.adversaries, currentAdversaryIndex: 0, combatLogs: [], activeVictoryModal: null });
  if (d.meta) cloud.storage.setItem(META, d.meta);
  else cloud.storage.removeItem(META);
  syncService.setUser(USER);
  (syncService as unknown as { lastApplied: string }).lastApplied = '';
};

/** Sincroniza e devolve quantas gravações foram feitas na nuvem. */
const sync = async () => {
  const before = cloud.stats.writes;
  await syncService.sync();
  return cloud.stats.writes - before;
};

const at = (day: number, hour: number, minute = 0) => vi.setSystemTime(new Date(2026, 10, day, hour, minute, 0));
const tick = (...indexes: number[]) => {
  const ms = useHabitStore.getState().missions;
  indexes.forEach((i) => useHabitStore.getState().toggleCompleteMission(ms[i].id));
};
const totals = () => {
  const p = useUserStore.getState().profile;
  return { totalXp: p.totalXp, ryo: p.ryo, level: p.level };
};

describe('sincronização de ponta a ponta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    at(9, 8);
    cloud.tables.profiles.clear();
    cloud.tables.missions.clear();
    cloud.stats.writes = 0;
    cloud.storage.clear();
    load(freshDevice());
  });
  afterEach(() => vi.useRealTimers());

  it('primeiro envio grava tudo; sincronizar de novo sem mudanças não grava nada', async () => {
    tick(3, 1);
    expect(await sync()).toBeGreaterThan(0);
    expect(cloud.tables.missions.size).toBe(6);
    expect(await sync()).toBe(0);
    expect(await sync()).toBe(0);
  });

  it('não entra em laço: aplicar dados da nuvem não gera novas gravações', async () => {
    tick(3, 1);
    await sync();
    const phone = capture();

    load(freshDevice(false)); // PC recém-instalado
    await sync();
    expect(totals()).toEqual({ totalXp: phone.profile.totalXp, ryo: phone.profile.ryo, level: phone.profile.level });
    expect(useHabitStore.getState().missions.filter((m) => m.isCompletedToday)).toHaveLength(2);
    expect(useUserStore.getState().profile.hasCompletedOnboarding).toBe(true);
    const profileRef = useUserStore.getState().profile;
    expect(await sync()).toBe(0);
    expect(useUserStore.getState().profile).toBe(profileRef);
  });

  it('dois aparelhos marcando missões diferentes: nada se perde e os totais batem', async () => {
    await sync();
    const base = capture();

    // Celular marca duas missões e envia
    tick(3, 1);
    await sync();
    const phone = capture();

    // PC (sem ter visto o celular) marca outra missão e sincroniza
    load(base);
    at(9, 9);
    tick(2);
    await sync();
    const pc = capture();
    expect(pc.missions.filter((m) => m.completedDates.includes('2026-11-09'))).toHaveLength(3);

    // Celular sincroniza de volta
    load(phone);
    at(9, 10);
    await sync();
    const p = useUserStore.getState().profile;
    expect(useHabitStore.getState().missions.filter((m) => m.isCompletedToday)).toHaveLength(3);
    expect({ totalXp: p.totalXp, ryo: p.ryo, level: p.level }).toEqual({
      totalXp: pc.profile.totalXp,
      ryo: pc.profile.ryo,
      level: pc.profile.level,
    });
    expect(deriveTotals(p.grants).totalXp).toBe(p.totalXp);
    expect(p.dayLog['2026-11-09'].completed).toBe(true);
    expect(await sync()).toBe(0);
  });

  it('desmarcar em um aparelho desfaz no outro (sem XP fantasma)', async () => {
    tick(3, 1);
    await sync();
    const pc = capture(); // PC já tinha as duas marcações

    at(9, 9);
    tick(1); // celular desmarca uma
    await sync();
    const phoneTotals = totals();

    load(pc);
    at(9, 10);
    await sync();
    expect(useHabitStore.getState().missions.filter((m) => m.isCompletedToday)).toHaveLength(1);
    expect(totals()).toEqual(phoneTotals);
  });

  it('BUG ORIGINAL: PC atrasado abre no dia seguinte e NÃO derruba o desafio', async () => {
    // Dia 8: desafio agendado para o dia 9 (sem carência de criação), nos dois aparelhos
    at(8, 10);
    useUserStore.getState().startChallenge({ targetDays: 66, startDate: '2026-11-09' });
    await sync();
    const pc = capture();

    // Celular cumpre os dias 9 e 10; falta no dia 11
    at(9, 20);
    useUserStore.getState().checkDayTransition();
    tick(3, 1);
    await sync();
    at(10, 20);
    useUserStore.getState().checkDayTransition();
    tick(3, 1);
    await sync();

    // PC, fechado desde o dia 8, é aberto no dia 12 — a nuvem ainda não respondeu
    load(pc);
    at(12, 9);
    useUserStore.getState().setCloudGate('pending');
    useUserStore.getState().checkDayTransition();
    expect(useUserStore.getState().profile.activeChallenge?.status).toBe('active');
    expect(useUserStore.getState().activeResetModal).toBeNull();

    // A nuvem responde: os dias 9 e 10 chegam cumpridos
    await sync();
    useUserStore.getState().setCloudGate('open');
    const state = useUserStore.getState();
    expect(state.profile.dayLog['2026-11-09'].completed).toBe(true);
    expect(state.profile.dayLog['2026-11-10'].completed).toBe(true);
    expect(state.profile.dayLog['2026-11-11'].completed).toBe(false);
    expect(state.profile.activeChallenge?.status).toBe('active');
    expect(state.profile.activeChallenge?.daysCompleted).toBe(2);
    expect(state.activeResetModal).toBeNull();
  });

  it('pior caso: PC offline encerra o ciclo por engano e ele é restaurado ao sincronizar', async () => {
    at(8, 10);
    useUserStore.getState().startChallenge({ targetDays: 66, startDate: '2026-11-09' });
    await sync();
    const pc = capture();

    at(9, 20);
    useUserStore.getState().checkDayTransition();
    tick(3, 1);
    await sync();
    at(10, 20);
    useUserStore.getState().checkDayTransition();
    tick(3, 1);
    await sync();

    // PC abre SEM internet no dia 12: com o que ele sabe, foram 2 faltas → ciclo encerrado
    load(pc);
    at(12, 9);
    useUserStore.getState().checkDayTransition();
    expect(useUserStore.getState().profile.activeChallenge).toBeUndefined();
    expect(useUserStore.getState().activeResetModal).not.toBeNull();

    // A internet volta
    await sync();
    const state = useUserStore.getState();
    expect(state.profile.activeChallenge?.status).toBe('active');
    expect(state.profile.challengeHistory).toEqual([]);
    expect(state.activeResetModal).toBeNull();

    // E o celular, ao sincronizar depois, continua com o ciclo ativo
    await sync();
    const row = cloud.tables.profiles.get(USER) as { avatar_config: { _activeChallenge?: { status: string }; _v: number } };
    expect(row.avatar_config._activeChallenge?.status).toBe('active');
    expect(row.avatar_config._v).toBe(3);
  });

  it('nuvem no formato antigo: totais preservados na migração', async () => {
    const legacyMissions = initialMissions.map((m, i) => ({
      id: m.id,
      user_id: USER,
      title: m.title,
      description: m.description,
      pillar_id: m.pillarId,
      rank: m.rank,
      xp_reward: m.xpReward,
      ryo_reward: m.ryoReward,
      time_of_day: m.timeOfDay,
      completed_dates: i === 3 ? ['2026-11-08'] : [],
      is_custom: false,
      mission_order: m.order,
      created_at: '2026-10-01T00:00:00+00:00',
    }));
    legacyMissions.forEach((m) => cloud.tables.missions.set(m.id, m));
    cloud.tables.profiles.set(USER, {
      id: USER,
      name: 'Afonso',
      gender: 'male',
      ryo: 1234,
      total_xp: 5000,
      pillar_xp: { taijutsu: 1000, ninjutsu: 1000, chakra: 1000, espirito: 1000, genjutsu: 1000 },
      best_streak: 4,
      has_completed_onboarding: true,
      avatar_config: {
        customEmoji: '🥷',
        _updatedAt: '2026-11-08T22:00:00.000Z',
        _dayLog: { '2026-11-08': { date: '2026-11-08', xpEarned: 200, xpTarget: 375, completed: true, closed: true } },
        _grants: {},
      },
      updated_at: '2026-11-08T22:00:00+00:00',
    });

    load(freshDevice(false));
    await sync();
    const p = useUserStore.getState().profile;
    expect(p.name).toBe('Afonso');
    expect(p.totalXp).toBe(5000);
    expect(p.ryo).toBe(1234);
    expect(p.pillarXp.chakra).toBe(1000);
    expect(p.dayLog['2026-11-08'].completed).toBe(true);
    expect(p.bestStreak).toBe(4);

    // A nuvem passa para o formato novo e estabiliza
    expect((cloud.tables.profiles.get(USER) as { avatar_config: { _v: number } }).avatar_config._v).toBe(3);
    expect(await sync()).toBe(0);
  });

  it('reset completo em um aparelho zera o outro', async () => {
    tick(3, 1);
    await sync();
    const pc = capture();

    at(9, 12);
    useUserStore.getState().resetProgress();
    useHabitStore.setState({ missions: initialMissions.map((m) => ({ ...m, completedDates: [], isCompletedToday: false })) });
    await sync();

    load(pc);
    at(9, 13);
    await sync();
    expect(totals()).toEqual({ totalXp: 0, ryo: 0, level: 1 });
    expect(useHabitStore.getState().missions.every((m) => m.completedDates.length === 0)).toBe(true);
  });

  it('missão excluída some da nuvem e do outro aparelho', async () => {
    await sync();
    const pc = capture();

    at(9, 9);
    const removed = useHabitStore.getState().missions[5].id;
    useHabitStore.getState().deleteMission(removed);
    await sync();
    expect(cloud.tables.missions.has(removed)).toBe(false);

    load(pc);
    at(9, 10);
    await sync();
    expect(useHabitStore.getState().missions.map((m) => m.id)).not.toContain(removed);
    expect(cloud.tables.missions.has(removed)).toBe(false);
  });
});
