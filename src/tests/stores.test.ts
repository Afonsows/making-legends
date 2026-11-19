import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
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
});

vi.mock('../utils/confetti', () => ({
  triggerMissionConfetti: () => undefined,
  triggerLevelUpConfetti: () => undefined,
  triggerBossDefeatedConfetti: () => undefined,
  triggerDayCompleteConfetti: () => undefined,
  triggerChallengeCompleteConfetti: () => undefined,
}));

vi.mock('../services/syncService', () => ({
  syncService: { deleteMission: () => undefined, pushMissions: () => undefined, pushUserProfile: () => undefined },
}));

import { useUserStore, createDefaultProfile } from '../state/useUserStore';
import { useHabitStore, initialMissions } from '../state/useHabitStore';
import { useDuelStore } from '../state/useDuelStore';
import { useToolStore, TOOL_LIMITS } from '../state/useToolStore';
import { useChallengeStore, migrateLegacyChallenges } from '../state/useChallengeStore';
import { isMissionActiveOn } from '../state/useHabitStore';
import { challengeStats, makeChallengeContext } from '../core/challenges';
import { useUIStore } from '../state/useUIStore';
import { originalAdversaries } from '../core/adversariesData';
import { getTodayString, addDaysToDateString } from '../core/dateUtils';
import { deriveTotals } from '../core/ledger';

/** Dá Ryō ao shinobi do jeito certo: com um lançamento no livro-razão. */
function seedRyo(amount: number) {
  useUserStore.getState().grantReward({ key: `test:ryo:${Math.random()}`, label: 'teste', baseXp: 0, baseRyo: amount, applyRyoBuffs: false });
}

function resetAll() {
  useUserStore.setState({
    profile: { ...createDefaultProfile(), hasCompletedOnboarding: true },
    activeLevelUpModal: null,
    activeResetModal: null,
    activeCompletionModal: null,
    toasts: [],
  });
  // Hábitos que já existiam antes das datas simuladas nos testes
  useHabitStore.setState({
    missions: initialMissions.map((m) => ({ ...m, completedDates: [], createdAt: '2026-01-01T00:00:00.000Z' })),
    missionLogs: [],
  });
  useDuelStore.setState({
    adversaries: originalAdversaries.map((a) => ({ ...a })),
    currentAdversaryIndex: 0,
    combatLogs: [],
    activeVictoryModal: null,
  });
  useChallengeStore.setState({ challenges: [], selectedChallengeId: null, isDetailModalOpen: false });
  useUIStore.setState({ seenChallengeOutcomes: [] });
  useToolStore.setState({ nutritionLogs: {}, trainingLogs: [], bodyJournal: {}, pomodoroSessionsCompletedToday: 0 });
}

const snapshot = () => {
  const p = useUserStore.getState().profile;
  return {
    totalXp: p.totalXp,
    ryo: p.ryo,
    level: p.level,
    pillarXp: { ...p.pillarXp },
    bossHp: useDuelStore.getState().adversaries.map((a) => a.currentHp),
  };
};

describe('missões: concluir e desfazer', () => {
  beforeEach(resetAll);

  it('desmarcar devolve exatamente XP, Ryō, pilar e HP do chefe', () => {
    const before = snapshot();
    const m = useHabitStore.getState().missions[3]; // Rank B
    useHabitStore.getState().toggleCompleteMission(m.id);
    const during = snapshot();
    expect(during.totalXp).toBeGreaterThan(before.totalXp);
    expect(during.ryo).toBeGreaterThan(before.ryo);
    useHabitStore.getState().toggleCompleteMission(m.id);
    expect(snapshot()).toEqual(before);
  });

  it('alternar várias vezes não gera XP nem dano extra', () => {
    const m = useHabitStore.getState().missions[1];
    useHabitStore.getState().toggleCompleteMission(m.id);
    const once = snapshot();
    for (let i = 0; i < 5; i++) {
      useHabitStore.getState().toggleCompleteMission(m.id);
      useHabitStore.getState().toggleCompleteMission(m.id);
    }
    const after = snapshot();
    expect(after.totalXp).toBe(once.totalXp);
    expect(after.ryo).toBe(once.ryo);
    // O dano pode variar (crítico aleatório), mas nunca acumula: 1 golpe ativo apenas
    const totalDamage = originalAdversaries.reduce((acc, a, i) => acc + (a.maxHp - after.bossHp[i]), 0);
    const missionXp = useUserStore.getState().profile.grants[`mission:${m.id}:${getTodayString()}`].xp;
    expect(totalDamage).toBeLessThanOrEqual(Math.ceil(missionXp * 1.35 * 1.5));
  });

  it('atingir 50% do XP acrescenta um dia à sequência e paga o estipêndio uma única vez', () => {
    const ms = useHabitStore.getState().missions;
    const today = getTodayString();
    useHabitStore.getState().toggleCompleteMission(ms[3].id); // B 140
    expect(useUserStore.getState().profile.dayLog[today].completed).toBe(false);
    useHabitStore.getState().toggleCompleteMission(ms[1].id); // C 85 → 225/375 ≥ 50%
    const p = useUserStore.getState().profile;
    expect(p.dayLog[today].completed).toBe(true);
    expect(p.grants[`checkin:${today}`]).toBeDefined();
    expect(p.currentStreak).toBe(1);

    // Desfazendo abaixo da meta, o estipêndio é estornado
    const ryoWithStipend = p.ryo;
    useHabitStore.getState().toggleCompleteMission(ms[1].id);
    const p2 = useUserStore.getState().profile;
    expect(p2.dayLog[today].completed).toBe(false);
    expect(p2.grants[`checkin:${today}`]).toBeUndefined();
    expect(p2.ryo).toBeLessThan(ryoWithStipend);
    expect(p2.currentStreak).toBe(0);
  });

  it('editar o rank de uma missão já concluída troca a recompensa sem distorções', () => {
    const before = snapshot();
    const m = useHabitStore.getState().missions[0]; // Rank E
    useHabitStore.getState().toggleCompleteMission(m.id);
    useHabitStore.getState().updateMission(m.id, { rank: 'S' });
    expect(useUserStore.getState().profile.totalXp).toBeGreaterThan(300);
    useHabitStore.getState().toggleCompleteMission(m.id);
    expect(snapshot()).toEqual(before);
  });

  it('excluir missão concluída hoje estorna a recompensa', () => {
    const before = snapshot();
    const m = useHabitStore.getState().missions[2];
    useHabitStore.getState().toggleCompleteMission(m.id);
    useHabitStore.getState().deleteMission(m.id);
    expect(snapshot()).toEqual(before);
  });
});

describe('duelo', () => {
  beforeEach(resetAll);

  it('derrotar e depois desfazer devolve o chefe, a relíquia e o Ryō de vitória', () => {
    useDuelStore.setState({
      adversaries: originalAdversaries.map((a, i) => (i === 0 ? { ...a, currentHp: 10 } : { ...a })),
    });
    const ryoBefore = useUserStore.getState().profile.ryo;
    const m = useHabitStore.getState().missions[3];
    useHabitStore.getState().toggleCompleteMission(m.id);
    expect(useDuelStore.getState().adversaries[0].isDefeated).toBe(true);
    expect(useUserStore.getState().profile.inventory).toContain(originalAdversaries[0].rewardItem.id);
    expect(useDuelStore.getState().activeVictoryModal).not.toBeNull();

    useHabitStore.getState().toggleCompleteMission(m.id);
    expect(useDuelStore.getState().adversaries[0].isDefeated).toBe(false);
    expect(useDuelStore.getState().adversaries[0].currentHp).toBe(10);
    expect(useUserStore.getState().profile.ryo).toBe(ryoBefore);
  });

  it('o golpe sempre vai para o primeiro chefe de pé, mesmo vendo outro na Arena', () => {
    useDuelStore.setState({
      adversaries: originalAdversaries.map((a, i) => (i === 0 ? { ...a, currentHp: 0, isDefeated: true } : { ...a })),
      currentAdversaryIndex: 0,
    });
    useHabitStore.getState().toggleCompleteMission(useHabitStore.getState().missions[1].id);
    expect(useDuelStore.getState().adversaries[1].currentHp).toBeLessThan(originalAdversaries[1].maxHp);
  });

  it('resgatar a vitória equipa a relíquia', () => {
    useDuelStore.setState({
      adversaries: originalAdversaries.map((a, i) => (i === 0 ? { ...a, currentHp: 1 } : { ...a })),
    });
    useUserStore.setState((s) => ({ profile: { ...s.profile, equippedItems: [] } }));
    useHabitStore.getState().toggleCompleteMission(useHabitStore.getState().missions[0].id);
    useDuelStore.getState().claimVictoryReward(true);
    expect(useUserStore.getState().profile.equippedItems).toContain(originalAdversaries[0].rewardItem.id);
  });
});

describe('ferramentas: limites diários', () => {
  beforeEach(resetAll);

  it('refeições só rendem XP até o limite diário', () => {
    for (let i = 0; i < TOOL_LIMITS.mealsRewarded + 3; i++) {
      useToolStore.getState().addMeal({ name: `Refeição ${i}`, calories: 400, protein: 30, time: '12:00' });
    }
    expect(useToolStore.getState().countRewardedToday('tool:meal:')).toBe(TOOL_LIMITS.mealsRewarded);
  });

  it('sono e sessão de foco pagam uma vez por dia, somente após o tempo terminar', () => {
    useToolStore.getState().logSleep(7, 4);
    const xp = useUserStore.getState().profile.totalXp;
    useToolStore.getState().logSleep(8, 5);
    useToolStore.getState().setSealLock(true, 60);
    expect(useUserStore.getState().profile.totalXp).toBe(xp);
    useToolStore.setState({ sealEndsAt: Date.now() - 1 });
    useToolStore.getState().completeSealIfDue();
    const xp2 = useUserStore.getState().profile.totalXp;
    useToolStore.getState().setSealLock(true, 60);
    useToolStore.setState({ sealEndsAt: Date.now() - 1 });
    useToolStore.getState().completeSealIfDue();
    expect(useUserStore.getState().profile.totalXp).toBe(xp2);
    expect(xp2).toBeGreaterThan(xp);
  });

  it('meta de água é estornada se o copo for removido', () => {
    for (let i = 0; i < TOOL_LIMITS.waterGoalGlasses; i++) useToolStore.getState().addWaterGlass();
    const xp = useUserStore.getState().profile.totalXp;
    expect(xp).toBeGreaterThan(0);
    useToolStore.getState().removeWaterGlass();
    expect(useUserStore.getState().profile.totalXp).toBe(0);
  });
});

/** Cria um desafio levando os hábitos avulsos atuais (como era o antigo "desafio principal"). */
function startChallenge(opts: { title?: string; targetDays?: number; startDate?: string; isEliteMode?: boolean } = {}) {
  const res = useChallengeStore.getState().createChallenge({
    title: opts.title || 'Desafio',
    targetDays: opts.targetDays || 21,
    startDate: opts.startDate,
    isEliteMode: opts.isEliteMode,
    moveMissionIds: useHabitStore.getState().missions.map((m) => m.id),
  });
  return res.challenge!;
}

const viewOf = (id: string) => {
  const { challenges } = useChallengeStore.getState();
  const ctx = makeChallengeContext(challenges, useHabitStore.getState().missions, useUserStore.getState().profile.habitLinks);
  return challengeStats(challenges.find((c) => c.id === id)!, ctx, getTodayString());
};

const activeToday = () => useHabitStore.getState().missions.filter((m) => isMissionActiveOn(m));

describe('desafios', () => {
  beforeEach(resetAll);

  it('criar respeita título, duração e Modo Elite; vários desafios correm juntos', () => {
    const a = startChallenge({ title: 'Meu Desafio', targetDays: 30, isEliteMode: true });
    expect(a).toMatchObject({ title: 'Meu Desafio', targetDays: 30, isEliteMode: true, v: 2 });
    expect(useUserStore.getState().profile.isHardModeEnabled).toBe(true);

    const b = useChallengeStore.getState().createChallenge({ title: 'Leitura', targetDays: 21, habits: [{ ...initialMissions[2], title: 'Ler' }] });
    expect(b.success).toBe(true);
    expect(useChallengeStore.getState().challenges.map((c) => c.title).sort()).toEqual(['Leitura', 'Meu Desafio']);
    expect(viewOf(a.id).state).toBe('active');
    expect(viewOf(b.challenge!.id).state).toBe('active');
  });

  it('início no passado é preservado para completar o histórico, sem gerar faltas', () => {
    const c = startChallenge({ startDate: addDaysToDateString(getTodayString(), -10) });
    expect(c.startDate).toBe(addDaysToDateString(getTodayString(), -10));
    expect(c.graceBefore).toBe(getTodayString());
    expect(viewOf(c.id).daysMissed).toBe(0);
  });

  it('hábito novo do desafio: marcar hoje paga, desmarcar estorna exatamente', () => {
    const res = useChallengeStore.getState().createChallenge({ title: 'Leitura', targetDays: 21, habits: [{ ...initialMissions[2], title: 'Ler' }] });
    const id = useHabitStore.getState().missions.find((m) => m.title === 'Ler')!.id;
    expect(useUserStore.getState().profile.habitLinks?.[id]?.challengeId).toBe(res.challenge!.id);
    const before = snapshot();
    useHabitStore.getState().toggleCompleteMission(id);
    expect(useUserStore.getState().profile.totalXp).toBeGreaterThan(before.totalXp);
    useHabitStore.getState().toggleCompleteMission(id);
    expect(snapshot()).toEqual(before);
  });

  it('hábitos podem ser marcados em dias passados do desafio, nunca no futuro nem antes do início', () => {
    startChallenge({ startDate: addDaysToDateString(getTodayString(), -3) });
    const m = useHabitStore.getState().missions[0];
    expect(useHabitStore.getState().toggleMissionOnDate(m.id, addDaysToDateString(getTodayString(), -1)).success).toBe(true);
    expect(useHabitStore.getState().missions[0].completedDates).toContain(addDaysToDateString(getTodayString(), -1));
    expect(useHabitStore.getState().toggleMissionOnDate(m.id, addDaysToDateString(getTodayString(), 1)).success).toBe(false);
    expect(useHabitStore.getState().toggleMissionOnDate(m.id, addDaysToDateString(getTodayString(), -5)).success).toBe(false);
  });
});

describe('virada de dia (viagem no tempo)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0, 0)); // segunda, 02/11/2026
    resetAll();
    useUserStore.setState((s) => ({ profile: { ...s.profile, lastActiveDate: getTodayString() } }));
  });

  const completeDay = () => {
    const ms = useHabitStore.getState().missions;
    useHabitStore.getState().toggleCompleteMission(ms[3].id);
    useHabitStore.getState().toggleCompleteMission(ms[1].id);
  };
  const nextDay = (days = 1) => {
    vi.setSystemTime(new Date(Date.now() + days * 86_400_000));
    useHabitStore.getState().resetDailyMissionsIfNewDay();
    useUserStore.getState().checkDayTransition();
  };

  it('faltas NÃO encerram: o escudo protege a sequência e o desafio segue, com as faltas contadas', () => {
    const c = startChallenge({ targetDays: 21 });
    completeDay();
    nextDay();
    completeDay();
    expect(useUserStore.getState().profile.currentStreak).toBe(2);

    nextDay(2); // pulou a quarta → escudo
    let p = useUserStore.getState().profile;
    expect(p.shieldedDates).toHaveLength(1);
    expect(p.currentStreak).toBe(2);

    completeDay();
    nextDay(2); // nova falta na mesma semana: antes encerrava o desafio
    const s = viewOf(c.id);
    expect(s.state).toBe('active');
    expect(s.daysMissed).toBe(2);
    expect(s.missesThisWeek).toBe(2);
    expect(s.dayNumber).toBe(6); // começou seg 02/11; hoje é sáb 07/11
    expect(useUserStore.getState().activeResetModal).toBeNull();
    expect(activeToday()).toHaveLength(6);
    vi.useRealTimers();
  });

  it('Modo Elite: a primeira falta encerra, avisa uma vez e os hábitos saem de Hoje', () => {
    const c = startChallenge({ targetDays: 21, isEliteMode: true });
    completeDay();
    nextDay(2); // terça perdida
    expect(viewOf(c.id).state).toBe('failed');
    expect(useUserStore.getState().activeResetModal?.challengeId).toBe(c.id);
    expect(activeToday()).toHaveLength(0);
    expect(useUserStore.getState().profile.isHardModeEnabled).toBe(false);

    useUserStore.getState().dismissResetModal();
    nextDay();
    expect(useUserStore.getState().activeResetModal).toBeNull(); // não avisa de novo
    vi.useRealTimers();
  });

  it('conclui depois do último dia: paga o bônus, comemora e os hábitos saem de Hoje', () => {
    const c = startChallenge({ targetDays: 7 });
    for (let i = 0; i < 7; i++) {
      completeDay();
      nextDay();
    }
    const state = useUserStore.getState();
    expect(viewOf(c.id).state).toBe('completed');
    expect(viewOf(c.id).daysCompleted).toBe(7);
    expect(state.profile.grants[`challenge:${c.id}`].ryo).toBeGreaterThan(0);
    expect(state.activeCompletionModal?.challengeId).toBe(c.id);
    expect(state.profile.currentStreak).toBe(7);
    expect(activeToday()).toHaveLength(0);
    expect(useChallengeStore.getState().challenges[0].status).toBe('completed');
    vi.useRealTimers();
  });

  it('desbloqueia pergaminhos pelos dias cumpridos e nunca os perde', () => {
    for (let i = 0; i < 3; i++) {
      completeDay();
      nextDay();
    }
    const cards = useUserStore.getState().profile.unlockedCards;
    expect(cards.length).toBeGreaterThanOrEqual(3);
    startChallenge({ targetDays: 21 });
    expect(useUserStore.getState().profile.unlockedCards).toEqual(cards);
    vi.useRealTimers();
  });
});

describe('arquitetura: totais derivados e autocorreção', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 21, 0, 0)); // segunda, 09/11/2026, 21h
    resetAll();
  });

  const tick = (...indexes: number[]) => {
    const ms = useHabitStore.getState().missions;
    indexes.forEach((i) => useHabitStore.getState().toggleCompleteMission(ms[i].id));
  };
  const goTo = (day: number, hour = 10) => {
    vi.setSystemTime(new Date(2026, 10, day, hour, 0, 0));
    useUserStore.getState().checkDayTransition();
  };

  it('XP, nível e Ryō sempre batem com o livro-razão', () => {
    tick(0, 1, 2, 3, 4, 5);
    tick(2);
    seedRyo(700);
    useUserStore.getState().buySoldierPill();
    const p = useUserStore.getState().profile;
    const derived = deriveTotals(p.grants);
    expect({ totalXp: p.totalXp, ryo: p.ryo, level: p.level, pillarXp: p.pillarXp }).toEqual({
      totalXp: derived.totalXp,
      ryo: derived.ryo,
      level: derived.level,
      pillarXp: derived.pillarXp,
    });
    vi.useRealTimers();
  });

  it('reconciliar repetidas vezes não muda nada (nem regrava o perfil nem os desafios)', () => {
    startChallenge({ targetDays: 21 });
    tick(3, 1);
    useUserStore.getState().reconcile();
    const before = useUserStore.getState().profile;
    const challenges = useChallengeStore.getState().challenges;
    for (let i = 0; i < 5; i++) useUserStore.getState().reconcile();
    expect(useUserStore.getState().profile).toBe(before);
    expect(useChallengeStore.getState().challenges).toBe(challenges);
    vi.useRealTimers();
  });

  it('Modo Elite criado à noite: o próprio dia não é falta; a primeira falta real encerra', () => {
    const c = startChallenge({ targetDays: 66, isEliteMode: true }); // 09/11 às 21h, sem missões feitas
    goTo(10);
    tick(3, 1); // dia 10 cumprido
    goTo(11, 9);
    expect(viewOf(c.id).state).toBe('active');
    expect(useUserStore.getState().activeResetModal).toBeNull();
    goTo(12); // dia 11 inteiro perdido
    expect(viewOf(c.id).state).toBe('failed');
    expect(viewOf(c.id).failedOn).toBe('2026-11-11');
    vi.useRealTimers();
  });

  it('aparelho atrasado: o desafio Elite "encerrado" volta sozinho quando as marcações chegam', () => {
    vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0));
    resetAll();
    const c = startChallenge({ targetDays: 66, startDate: '2026-11-09', isEliteMode: true }); // agendado: sem carência
    goTo(9);
    tick(3, 1);
    goTo(12); // dias 10 e 11 cumpridos no celular, ainda não chegaram
    expect(viewOf(c.id).state).toBe('failed');
    expect(useUserStore.getState().activeResetModal).not.toBeNull();

    const merged = useHabitStore.getState().missions.map((m, i) =>
      i === 3 || i === 1 ? { ...m, completedDates: [...m.completedDates, '2026-11-10', '2026-11-11'] } : m
    );
    useHabitStore.getState().replaceMissions(merged);
    useUserStore.getState().checkDayTransition();

    expect(viewOf(c.id).state).toBe('active');
    expect(viewOf(c.id).daysCompleted).toBe(3);
    expect(useUserStore.getState().activeResetModal).toBeNull();
    expect(useUserStore.getState().profile.currentStreak).toBe(3);
    vi.useRealTimers();
  });

  it('com a nuvem pendente, nada é fechado nem avisado; com a nuvem aberta, as faltas reais valem', () => {
    const c = startChallenge({ targetDays: 66, startDate: '2026-11-09', isEliteMode: true });
    useUserStore.getState().setCloudGate('pending');
    goTo(13);
    expect(useUserStore.getState().profile.dayLog['2026-11-10']).toBeUndefined();
    expect(useUserStore.getState().activeResetModal).toBeNull();
    useUserStore.getState().setCloudGate('open');
    expect(viewOf(c.id).state).toBe('failed');
    expect(useUserStore.getState().activeResetModal?.challengeId).toBe(c.id);
    vi.useRealTimers();
  });

  it('corrigir um dia passado reavalia o desafio na hora, sem pagar recompensa', () => {
    vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0));
    resetAll();
    const c = startChallenge({ targetDays: 66, startDate: '2026-11-09', isEliteMode: true });
    goTo(9);
    tick(3, 1);
    goTo(11); // dia 10 perdido → encerrado (Elite)
    expect(viewOf(c.id).state).toBe('failed');

    const ms = useHabitStore.getState().missions;
    useHabitStore.getState().toggleMissionOnDate(ms[3].id, '2026-11-10');
    useHabitStore.getState().toggleMissionOnDate(ms[1].id, '2026-11-10');
    expect(useUserStore.getState().profile.dayLog['2026-11-10'].completed).toBe(true);
    expect(viewOf(c.id).state).toBe('active');
    expect(useUserStore.getState().profile.grants[`retro:${ms[3].id}:2026-11-10`].xp).toBe(0);

    useHabitStore.getState().toggleMissionOnDate(ms[3].id, '2026-11-10');
    expect(useUserStore.getState().profile.dayLog['2026-11-10'].completed).toBe(false);
    expect(viewOf(c.id).state).toBe('failed');
    vi.useRealTimers();
  });

  it('excluir missão e desafio deixa lápides para os outros aparelhos', () => {
    const c = startChallenge({ targetDays: 30 });
    const m = useHabitStore.getState().missions[0];
    useHabitStore.getState().toggleCompleteMission(m.id);
    useChallengeStore.getState().deleteChallenge(c.id);
    const p = useUserStore.getState().profile;
    expect(p.deletedCycles[c.id]).toBeDefined();
    expect(p.deletedMissions[m.id]).toBeDefined();
    expect(p.revoked[`mission:${m.id}:2026-11-09`]).toBeDefined();
    expect(useHabitStore.getState().missions).toEqual([]);
    vi.useRealTimers();
  });
});

describe('loja', () => {
  beforeEach(resetAll);

  it('compra exige Ryō suficiente e adiciona o item ao inventário', () => {
    expect(useUserStore.getState().buyItem('kunai_de_aco_polido').success).toBe(false);
    seedRyo(3000);
    expect(useUserStore.getState().buyItem('kunai_de_aco_polido').success).toBe(true);
    expect(useUserStore.getState().profile.ryo).toBe(500);
    expect(useUserStore.getState().profile.inventory).toContain('kunai_de_aco_polido');
    expect(useUserStore.getState().buyItem('kunai_de_aco_polido').success).toBe(false);
  });

  it('Pílula de Soldado vale uma vez por dia e aumenta o XP', () => {
    seedRyo(2000);
    expect(useUserStore.getState().buySoldierPill().success).toBe(true);
    expect(useUserStore.getState().profile.ryo).toBe(1400);
    expect(useUserStore.getState().buySoldierPill().success).toBe(false);
    useHabitStore.getState().toggleCompleteMission(useHabitStore.getState().missions[2].id); // D 50 XP
    const grant = useUserStore.getState().profile.grants[`mission:${useHabitStore.getState().missions[2].id}:${getTodayString()}`];
    expect(grant.xp).toBeGreaterThan(50);
  });
});


describe('liberdade do usuário: desafios, hábitos e preferências', () => {
  beforeEach(resetAll);

  it('encerrar tira os hábitos de Hoje; reabrir traz de volta', () => {
    const c = startChallenge({ title: 'Desafio Teste', targetDays: 30 });
    expect(activeToday()).toHaveLength(6);
    useChallengeStore.getState().closeChallenge(c.id, 'abandoned');
    expect(viewOf(c.id).state).toBe('abandoned');
    expect(activeToday()).toHaveLength(0);
    useChallengeStore.getState().reopenChallenge(c.id);
    expect(viewOf(c.id).state).toBe('active');
    expect(activeToday()).toHaveLength(6);
  });

  it('reseta a progressão sem apagar a identidade do perfil', () => {
    useUserStore.setState((state) => ({ profile: { ...state.profile, name: 'Afonso', email: 'afonso@example.com' } }));
    seedRyo(450);
    useHabitStore.getState().toggleCompleteMission(useHabitStore.getState().missions[3].id);
    expect(useUserStore.getState().profile.totalXp).toBeGreaterThan(0);
    useUserStore.getState().resetProgress();
    const profile = useUserStore.getState().profile;
    expect(profile.resetEpoch).toBeDefined();
    expect(profile.grants).toEqual({});
    expect(profile.name).toBe('Afonso');
    expect(profile.email).toBe('afonso@example.com');
    expect(profile.totalXp).toBe(0);
    expect(profile.ryo).toBe(0);
    expect(profile.hasCompletedOnboarding).toBe(true);
  });

  it('excluir um desafio estorna só o que ELE deu; outro desafio e os avulsos ficam intactos', () => {
    const keep = useChallengeStore.getState().createChallenge({ title: 'Fica', targetDays: 21, habits: [{ ...initialMissions[2], title: 'Ler' }] }).challenge!;
    const gone = useChallengeStore.getState().createChallenge({ title: 'Sai', targetDays: 21, habits: [{ ...initialMissions[1], title: 'Treinar' }] }).challenge!;
    const ms = useHabitStore.getState().missions;
    const ler = ms.find((m) => m.title === 'Ler')!;
    const treinar = ms.find((m) => m.title === 'Treinar')!;
    const avulsa = ms[0];
    useHabitStore.getState().toggleCompleteMission(avulsa.id);
    useHabitStore.getState().toggleCompleteMission(ler.id);
    const before = snapshot();
    useHabitStore.getState().toggleCompleteMission(treinar.id);
    expect(useUserStore.getState().profile.totalXp).toBeGreaterThan(before.totalXp);

    useChallengeStore.getState().deleteChallenge(gone.id);
    expect(snapshot()).toEqual(before);
    expect(useChallengeStore.getState().challenges.map((c) => c.id)).toEqual([keep.id]);
    expect(useHabitStore.getState().missions.find((m) => m.id === treinar.id)).toBeUndefined();
    expect(useHabitStore.getState().missions.find((m) => m.id === ler.id)?.isCompletedToday).toBe(true);
    expect(useHabitStore.getState().missions.find((m) => m.id === avulsa.id)?.isCompletedToday).toBe(true);
  });

  it('permite editar o desafio (título e duração)', () => {
    const c = startChallenge({ title: 'Desafio Original', targetDays: 21 });
    useChallengeStore.getState().updateChallenge(c.id, { title: 'Desafio Renomeado', targetDays: 45 });
    const after = useChallengeStore.getState().challenges[0];
    expect(after).toMatchObject({ title: 'Desafio Renomeado', targetDays: 45 });
    expect(after.updatedAt! >= c.updatedAt!).toBe(true);
  });

  it('retirar hábito com histórico guarda o histórico; sem histórico, exclui', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 2, 10, 0, 0));
    resetAll();
    const c = startChallenge({ targetDays: 21 });
    const [a, b] = useHabitStore.getState().missions;
    useHabitStore.getState().toggleCompleteMission(a.id);
    vi.setSystemTime(new Date(2026, 10, 3, 10, 0, 0));
    useUserStore.getState().checkDayTransition();

    useHabitStore.getState().deleteMission(a.id);
    expect(useHabitStore.getState().missions.find((m) => m.id === a.id)?.completedDates).toEqual(['2026-11-02']);
    expect(useUserStore.getState().profile.habitLinks?.[a.id]?.until).toBe('2026-11-02');
    expect(activeToday().some((m) => m.id === a.id)).toBe(false);

    useHabitStore.getState().deleteMission(b.id);
    expect(useHabitStore.getState().missions.find((m) => m.id === b.id)).toBeUndefined();
    expect(viewOf(c.id).days[0].pct).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('conversão local: o antigo desafio principal e suas missões passam para o modelo único', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 19, 10, 0, 0));
    resetAll();
    useUserStore.setState((s) => ({
      profile: {
        ...s.profile,
        habitLinks: {},
        challengeHistory: [
          {
            id: 'cycle_1',
            cycleNumber: 1,
            title: 'Protocolo',
            targetDays: 66,
            startDate: '2026-11-08',
            status: 'failed',
            failedReason: '2 faltas na Semana 1',
            endDate: '2026-11-11',
            currentDay: 4,
            daysCompleted: 1,
            checkIns: {},
            totalXpEarned: 0,
            createdAt: '2026-11-09T16:53:56.839Z',
          },
        ],
      },
    }));
    migrateLegacyChallenges();
    const p = useUserStore.getState().profile;
    expect(p.challengeHistory).toEqual([]);
    expect(useChallengeStore.getState().challenges).toHaveLength(1);
    expect(viewOf('cycle_1').state).toBe('active');
    expect(Object.values(p.habitLinks || {}).every((l) => l.challengeId === 'cycle_1')).toBe(true);
    // Rodar de novo não muda nada
    const challenges = useChallengeStore.getState().challenges;
    migrateLegacyChallenges();
    expect(useChallengeStore.getState().challenges).toBe(challenges);
    vi.useRealTimers();
  });

  it('permite marcar todas e desmarcar todas as missões de hoje com liberdade', () => {
    const store = useHabitStore.getState();
    expect(store.missions.every((m) => !m.isCompletedToday)).toBe(true);

    useHabitStore.getState().completeAllMissionsToday();
    expect(useHabitStore.getState().missions.every((m) => m.isCompletedToday)).toBe(true);

    useHabitStore.getState().uncompleteAllMissionsToday();
    expect(useHabitStore.getState().missions.every((m) => !m.isCompletedToday)).toBe(true);
  });

  it('controla preferências de UI, modo clean e toggles de expansão/recolhimento', () => {
    const ui = useUIStore.getState();
    expect(ui.isCleanMode).toBe(false);
    ui.toggleCleanMode();
    expect(useUIStore.getState().isCleanMode).toBe(true);

    ui.toggleDailyCheckIn();
    expect(useUIStore.getState().isDailyCheckInCollapsed).toBe(true);

    ui.toggleDailyScroll();
    expect(useUIStore.getState().isDailyScrollCollapsed).toBe(true);

    ui.togglePendingMissions();
    expect(useUIStore.getState().isPendingMissionsCollapsed).toBe(true);
  });
});
