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
import { useChallengeStore } from '../state/useChallengeStore';
import { useUIStore } from '../state/useUIStore';
import { originalAdversaries } from '../core/adversariesData';
import { getTodayString, addDaysToDateString } from '../core/dateUtils';

function resetAll() {
  useUserStore.setState({
    profile: { ...createDefaultProfile(), hasCompletedOnboarding: true },
    activeLevelUpModal: null,
    activeResetModal: null,
    activeCompletionModal: null,
    toasts: [],
  });
  useHabitStore.setState({ missions: initialMissions.map((m) => ({ ...m, completedDates: [] })), missionLogs: [] });
  useDuelStore.setState({
    adversaries: originalAdversaries.map((a) => ({ ...a })),
    currentAdversaryIndex: 0,
    combatLogs: [],
    activeVictoryModal: null,
  });
  useChallengeStore.setState({ challenges: [] });
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

describe('desafios', () => {
  beforeEach(resetAll);

  it('iniciar respeita título, duração e Modo Elite escolhidos', () => {
    const cycle = useUserStore.getState().startChallenge({ title: 'Meu Desafio', targetDays: 30, isEliteMode: true });
    expect(cycle.title).toBe('Meu Desafio');
    expect(cycle.targetDays).toBe(30);
    expect(cycle.isEliteMode).toBe(true);
    expect(useUserStore.getState().profile.isHardModeEnabled).toBe(true);
    expect(useUserStore.getState().toggleHardMode().success).toBe(false);
  });

  it('preserva a data de início no passado para permitir completar o histórico', () => {
    const cycle = useUserStore.getState().startChallenge({ startDate: addDaysToDateString(getTodayString(), -10) });
    expect(cycle.startDate).toBe(addDaysToDateString(getTodayString(), -10));
  });

  it('hábito de desafio personalizado paga hoje e estorna ao desmarcar', () => {
    const res = useChallengeStore.getState().createChallenge({ title: 'Leitura', targetDays: 21, initialHabits: [{ title: 'Ler' }] });
    const ch = res.challenge!;
    const before = snapshot();
    useChallengeStore.getState().toggleHabitDay(ch.id, ch.habits[0].id, getTodayString());
    expect(useUserStore.getState().profile.totalXp).toBeGreaterThan(before.totalXp);
    useChallengeStore.getState().toggleHabitDay(ch.id, ch.habits[0].id, getTodayString());
    expect(snapshot()).toEqual(before);
  });

  it('missões do desafio principal podem ser marcadas em dias passados, nunca no futuro', () => {
    const m = useHabitStore.getState().missions[0];
    const res = useChallengeStore
      .getState()
      .toggleHabitDay('challenge_official_66', m.id, addDaysToDateString(getTodayString(), -1));
    expect(res.blockedReason).toBeUndefined();
    expect(useHabitStore.getState().missions[0].completedDates).toContain(addDaysToDateString(getTodayString(), -1));
    const future = useChallengeStore.getState().toggleHabitDay('challenge_official_66', m.id, addDaysToDateString(getTodayString(), 1));
    expect(future.blockedReason).toBeDefined();
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

  it('escudo protege a 1ª falta da semana e o desafio cai na 2ª', () => {
    useUserStore.getState().startChallenge({ targetDays: 21 });
    completeDay();
    nextDay();
    completeDay();
    expect(useUserStore.getState().profile.currentStreak).toBe(2);

    nextDay(2); // pulou um dia inteiro (quarta) → escudo
    let p = useUserStore.getState().profile;
    expect(p.shieldedDates).toHaveLength(1);
    expect(p.currentStreak).toBe(2);
    expect(p.activeChallenge?.status).toBe('active');
    expect(p.activeChallenge?.currentDay).toBe(4);

    completeDay();
    nextDay(2); // nova falta na mesma semana → desafio encerrado
    p = useUserStore.getState().profile;
    expect(p.activeChallenge).toBeUndefined();
    expect(p.challengeHistory?.[0].status).toBe('failed');
    expect(useUserStore.getState().activeResetModal).not.toBeNull();
    vi.useRealTimers();
  });

  it('conclui o desafio após o último dia e paga o bônus', () => {
    useUserStore.getState().startChallenge({ targetDays: 7 });
    for (let i = 0; i < 7; i++) {
      completeDay();
      nextDay();
    }
    const state = useUserStore.getState();
    expect(state.profile.activeChallenge).toBeUndefined();
    expect(state.profile.challengeHistory?.[0].status).toBe('completed');
    expect(state.profile.challengeHistory?.[0].daysCompleted).toBe(7);
    expect(state.activeCompletionModal?.cycle.rewardRyo).toBeGreaterThan(0);
    expect(state.profile.currentStreak).toBe(7);
    vi.useRealTimers();
  });

  it('desbloqueia pergaminhos pelos dias cumpridos e nunca os perde', () => {
    for (let i = 0; i < 3; i++) {
      completeDay();
      nextDay();
    }
    const cards = useUserStore.getState().profile.unlockedCards;
    expect(cards.length).toBeGreaterThanOrEqual(3);
    useUserStore.getState().startChallenge({ targetDays: 21 });
    expect(useUserStore.getState().profile.unlockedCards).toEqual(cards);
    vi.useRealTimers();
  });
});

describe('loja', () => {
  beforeEach(resetAll);

  it('compra exige Ryō suficiente e adiciona o item ao inventário', () => {
    expect(useUserStore.getState().buyItem('kunai_de_aco_polido').success).toBe(false);
    useUserStore.setState((s) => ({ profile: { ...s.profile, ryo: 3000 } }));
    expect(useUserStore.getState().buyItem('kunai_de_aco_polido').success).toBe(true);
    expect(useUserStore.getState().profile.ryo).toBe(500);
    expect(useUserStore.getState().profile.inventory).toContain('kunai_de_aco_polido');
    expect(useUserStore.getState().buyItem('kunai_de_aco_polido').success).toBe(false);
  });

  it('Pílula de Soldado vale uma vez por dia e aumenta o XP', () => {
    useUserStore.setState((s) => ({ profile: { ...s.profile, ryo: 2000 } }));
    expect(useUserStore.getState().buySoldierPill().success).toBe(true);
    expect(useUserStore.getState().buySoldierPill().success).toBe(false);
    useHabitStore.getState().toggleCompleteMission(useHabitStore.getState().missions[2].id); // D 50 XP
    const grant = useUserStore.getState().profile.grants[`mission:${useHabitStore.getState().missions[2].id}:${getTodayString()}`];
    expect(grant.xp).toBeGreaterThan(50);
  });
});


describe('liberdade do usuário: desafios, missões e clean mode', () => {
  beforeEach(resetAll);

  it('permite cancelar e excluir o desafio ativo livremente', () => {
    useUserStore.getState().startChallenge({ title: 'Desafio Teste', targetDays: 30 });
    expect(useUserStore.getState().profile.activeChallenge).toBeDefined();
    expect(useUserStore.getState().profile.activeChallenge?.title).toBe('Desafio Teste');

    useUserStore.getState().deleteActiveChallenge();
    expect(useUserStore.getState().profile.activeChallenge).toBeUndefined();
    expect(useUserStore.getState().profile.currentProtocolDay).toBe(0);
  });

  it('reseta a progressão sem apagar a identidade do perfil', () => {
    useUserStore.setState((state) => ({
      profile: {
        ...state.profile,
        name: 'Afonso',
        email: 'afonso@example.com',
        totalXp: 900,
        ryo: 450,
        challengeHistory: [{ id: 'old', cycleNumber: 1, startDate: getTodayString(), status: 'failed', currentDay: 1, daysCompleted: 0, checkIns: {}, totalXpEarned: 0, createdAt: new Date().toISOString() }],
      },
    }));
    useUserStore.getState().resetProgress();
    const profile = useUserStore.getState().profile;
    expect(profile.name).toBe('Afonso');
    expect(profile.email).toBe('afonso@example.com');
    expect(profile.totalXp).toBe(0);
    expect(profile.ryo).toBe(0);
    expect(profile.challengeHistory).toEqual([]);
    expect(profile.hasCompletedOnboarding).toBe(true);
  });

  it('excluir o desafio ativo estorna XP e Ryō obtidos no ciclo', () => {
    useUserStore.getState().startChallenge({ title: 'Desafio com recompensa', targetDays: 30 });
    const before = snapshot();
    useHabitStore.getState().toggleCompleteMission(useHabitStore.getState().missions[0].id);
    expect(useUserStore.getState().profile.totalXp).toBeGreaterThan(before.totalXp);

    useUserStore.getState().deleteActiveChallenge();
    expect(snapshot()).toEqual(before);
    expect(useHabitStore.getState().missions[0].completedDates).toEqual([]);
  });

  it('permite editar o desafio ativo (título e dias)', () => {
    useUserStore.getState().startChallenge({ title: 'Desafio Original', targetDays: 21 });
    useUserStore.getState().updateActiveChallenge({ title: 'Desafio Renomeado', targetDays: 45 });
    expect(useUserStore.getState().profile.activeChallenge?.title).toBe('Desafio Renomeado');
    expect(useUserStore.getState().profile.activeChallenge?.targetDays).toBe(45);
  });

  it('permite excluir ciclos individuais do histórico e limpar o histórico', () => {
    useUserStore.getState().startChallenge({ targetDays: 21 });
    useUserStore.getState().abandonChallenge();
    expect(useUserStore.getState().profile.challengeHistory?.length).toBe(1);

    const cycleId = useUserStore.getState().profile.challengeHistory![0].id;
    useUserStore.getState().deleteHistoryCycle(cycleId);
    expect(useUserStore.getState().profile.challengeHistory?.length).toBe(0);

    useUserStore.setState((s) => ({
      profile: {
        ...s.profile,
        challengeHistory: [
          {
            id: 'c1',
            cycleNumber: 1,
            startDate: '2026-01-01',
            status: 'failed',
            currentDay: 5,
            daysCompleted: 4,
            checkIns: {},
            totalXpEarned: 100,
            createdAt: '2026-01-01',
          },
        ],
      },
    }));
    expect(useUserStore.getState().profile.challengeHistory?.length).toBe(1);
    useUserStore.getState().clearChallengeHistory();
    expect(useUserStore.getState().profile.challengeHistory?.length).toBe(0);
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
