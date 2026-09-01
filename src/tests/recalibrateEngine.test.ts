import { isValidDateString, getTodayString } from '../core/streakEngine';
import { getLevelFromTotalXp, getRankIdFromLevel, getRequiredXpForLevel } from '../core/xpEngine';
import { getDefaultRyoReward, getLevelUpRyoReward, getDailyCheckInRyoBonus } from '../core/ryoEngine';
import { Mission, ProtocolChallengeCycle, UserProfile } from '../core/types';
import { shinobiTheme } from '../theme/shinobi.theme';

// Test runner assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

export function runTests() {
  console.log('--- Iniciando Testes de Recalibração de Ryō e XP ---\n');

  // Test 1: Date validation
  console.log('1. Testando Validação de Datas (isValidDateString)');
  assert(isValidDateString('2026-09-01') === true, '2026-09-01 deve ser válida');
  assert(isValidDateString('2026-08-31') === true, '2026-08-31 deve ser válida');
  assert(isValidDateString('2024-02-29') === true, '2024-02-29 (ano bissexto) deve ser válida');
  assert(isValidDateString('dia_1_protocolo') === false, 'dia_1_protocolo deve ser INVÁLIDA');
  assert(isValidDateString('invalido') === false, 'invalido deve ser INVÁLIDA');
  assert(isValidDateString('') === false, 'string vazia deve ser INVÁLIDA');
  assert(isValidDateString(null) === false, 'null deve ser INVÁLIDO');
  assert(isValidDateString(undefined) === false, 'undefined deve ser INVÁLIDO');
  assert(isValidDateString('2026-02-30') === false, '2026-02-30 (dia inexistente) deve ser INVÁLIDA');
  assert(isValidDateString('2026-13-01') === false, '2026-13-01 (mês inexistente) deve ser INVÁLIDA');

  // Test 2: Level calculation
  console.log('\n2. Testando Progressão de Nível e Recompensas');
  assert(getLevelFromTotalXp(0) === 1, '0 XP deve ser Nível 1');
  assert(getLevelFromTotalXp(99) === 1, '99 XP deve ser Nível 1');
  assert(getLevelFromTotalXp(100) === 2, '100 XP deve ser Nível 2');
  assert(getLevelFromTotalXp(350) === 3, '350 XP deve ser Nível 3');
  assert(getLevelUpRyoReward(2) === 70, 'Nível 2 deve conceder 70 Ryō');
  assert(getLevelUpRyoReward(3) === 80, 'Nível 3 deve conceder 80 Ryō');
  assert(getLevelUpRyoReward(4) === 90, 'Nível 4 deve conceder 90 Ryō');

  // Test 3: Pure Recalibrate Simulation Function
  console.log('\n3. Testando Lógica de Recalibração');

  function simulateRecalibration(
    missions: Mission[],
    activeChallenge?: ProtocolChallengeCycle,
    challengeHistory: ProtocolChallengeCycle[] = []
  ) {
    const todayStr = getTodayString();
    let totalCalculatedXp = 0;
    let totalCalculatedRyo = 0;
    const pillarXpMap: Record<string, number> = {
      taijutsu: 0,
      ninjutsu: 0,
      chakra: 0,
      espirito: 0,
      genjutsu: 0,
    };

    const sanitizedMissions = missions.map((m) => {
      const rankInfo = shinobiTheme.missionRanks[m.rank] || shinobiTheme.missionRanks.D;
      const ryoPerCompletion = (!m.isCustom || !m.ryoReward || (m.ryoReward === 25 && m.rank !== 'E'))
        ? (rankInfo.ryoReward || getDefaultRyoReward(m.rank))
        : m.ryoReward;
      const xpPerCompletion = (!m.isCustom || !m.xpReward)
        ? rankInfo.xpReward
        : m.xpReward;

      const validDates = (m.completedDates || []).filter(
        (d) => typeof d === 'string' && isValidDateString(d) && d <= todayStr && (d !== todayStr || m.isCompletedToday)
      );

      const activeDatesSet = new Set<string>(validDates);

      if (m.isCompletedToday) {
        activeDatesSet.add(todayStr);
      } else {
        activeDatesSet.delete(todayStr);
      }

      const sortedDates = Array.from(activeDatesSet).sort();
      const netCompletions = sortedDates.length;

      if (netCompletions > 0) {
        const missionXp = xpPerCompletion * netCompletions;
        const missionRyo = ryoPerCompletion * netCompletions;

        totalCalculatedXp += missionXp;
        totalCalculatedRyo += missionRyo;
        pillarXpMap[m.pillarId] = (pillarXpMap[m.pillarId] || 0) + missionXp;
      }

      return {
        ...m,
        ryoReward: ryoPerCompletion,
        xpReward: xpPerCompletion,
        isCompletedToday: activeDatesSet.has(todayStr),
        completedDates: sortedDates,
      };
    });

    const allCycles = [activeChallenge, ...challengeHistory].filter(Boolean) as ProtocolChallengeCycle[];
    allCycles.forEach((cycle) => {
      if (cycle?.checkIns) {
        Object.values(cycle.checkIns).forEach((checkIn) => {
          if (checkIn && checkIn.checked) {
            const checkInBonus = getDailyCheckInRyoBonus(1, 1);
            totalCalculatedRyo += checkInBonus;
          }
        });
      }
    });

    const newLevel = getLevelFromTotalXp(totalCalculatedXp);
    const newRank = getRankIdFromLevel(newLevel);

    for (let lvl = 2; lvl <= newLevel; lvl++) {
      totalCalculatedRyo += getLevelUpRyoReward(lvl);
    }

    return {
      totalXp: totalCalculatedXp,
      level: newLevel,
      rank: newRank,
      ryo: totalCalculatedRyo,
      pillarXp: pillarXpMap,
      sanitizedMissions,
    };
  }

  // Scenario A: All missions uncompleted (0 active completions)
  const initialMissions: Mission[] = [
    { id: '1', title: 'M1', pillarId: 'chakra', rank: 'E', xpReward: 25, ryoReward: 15, timeOfDay: 'morning', isCompletedToday: false, completedDates: [], isCustom: false, order: 1, createdAt: '' },
    { id: '2', title: 'M2', pillarId: 'taijutsu', rank: 'C', xpReward: 85, ryoReward: 70, timeOfDay: 'morning', isCompletedToday: false, completedDates: [], isCustom: false, order: 2, createdAt: '' },
    { id: '3', title: 'M3', pillarId: 'ninjutsu', rank: 'D', xpReward: 50, ryoReward: 35, timeOfDay: 'afternoon', isCompletedToday: false, completedDates: [], isCustom: false, order: 3, createdAt: '' },
    { id: '4', title: 'M4', pillarId: 'genjutsu', rank: 'B', xpReward: 140, ryoReward: 130, timeOfDay: 'afternoon', isCompletedToday: false, completedDates: [], isCustom: false, order: 4, createdAt: '' },
    { id: '5', title: 'M5', pillarId: 'espirito', rank: 'D', xpReward: 50, ryoReward: 35, timeOfDay: 'evening', isCompletedToday: false, completedDates: [], isCustom: false, order: 5, createdAt: '' },
    { id: '6', title: 'M6', pillarId: 'chakra', rank: 'E', xpReward: 25, ryoReward: 15, timeOfDay: 'evening', isCompletedToday: false, completedDates: [], isCustom: false, order: 6, createdAt: '' },
  ];

  const resA = simulateRecalibration(initialMissions);
  assert(resA.totalXp === 0, 'Cenário A: totalXp deve ser 0');
  assert(resA.level === 1, 'Cenário A: level deve ser 1');
  assert(resA.ryo === 0, 'Cenário A: ryo deve ser 0');

  // Scenario B: With corrupted legacy strings ('dia_1_protocolo') and uncompleted missions
  const corruptedMissions: Mission[] = initialMissions.map((m) => ({
    ...m,
    isCompletedToday: false,
    completedDates: ['dia_1_protocolo', 'data_invalida', ''],
  }));

  const resB = simulateRecalibration(corruptedMissions);
  assert(resB.totalXp === 0, 'Cenário B (Strings corrompidas): totalXp deve ser 0');
  assert(resB.level === 1, 'Cenário B (Strings corrompidas): level deve ser 1');
  assert(resB.ryo === 0, 'Cenário B (Strings corrompidas): ryo deve ser 0');
  assert(resB.sanitizedMissions.every((m) => m.completedDates.length === 0), 'Cenário B: Todas as completedDates foram higienizadas para vazio');

  // Scenario C: Complete 2 missions today (M1: 25 XP/15 Ryo, M2: 85 XP/70 Ryo) -> Total XP 110 -> Level 2 (+70 level-up Ryo)
  const completedTodayMissions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[1], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[2], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[4], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[5], isCompletedToday: false, completedDates: [] },
  ];

  const resC = simulateRecalibration(completedTodayMissions);
  assert(resC.totalXp === 110, 'Cenário C: totalXp deve ser 110 (25 + 85)');
  assert(resC.level === 2, 'Cenário C: level deve ser 2');
  assert(resC.ryo === 155, 'Cenário C: ryo deve ser 155 (15 + 70 + 70 de level-up)');
  assert(resC.pillarXp.chakra === 25, 'Cenário C: chakra XP deve ser 25');
  assert(resC.pillarXp.taijutsu === 85, 'Cenário C: taijutsu XP deve ser 85');
  assert(resC.pillarXp.ninjutsu === 0, 'Cenário C: ninjutsu XP deve ser 0');

  // Scenario D: User completes M3 (Rank D: 50 XP, 35 Ryo) and then CANCELS it (isCompletedToday = false)
  // Even if completedDates still had todayStr from a race condition, it must be purged!
  const cancelledM3Missions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[1], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[2], isCompletedToday: false, completedDates: [getTodayString()] }, // cancelled!
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[4], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[5], isCompletedToday: false, completedDates: [] },
  ];

  const resD = simulateRecalibration(cancelledM3Missions);
  assert(resD.totalXp === 110, 'Cenário D (Cancelamento): totalXp deve permanecer 110');
  assert(resD.level === 2, 'Cenário D (Cancelamento): level deve ser 2');
  assert(resD.ryo === 155, 'Cenário D (Cancelamento): ryo deve permanecer 155');
  assert(resD.sanitizedMissions[2].completedDates.length === 0, 'Cenário D: data de hoje foi removida da missão cancelada');

  // Scenario E: Multi-day completions with 1 check-in confirmed
  const multiDayMissions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: false, completedDates: ['2026-08-30', '2026-08-31'] }, // 2 completions = 50 XP, 30 Ryo
    { ...initialMissions[1], isCompletedToday: true, completedDates: ['2026-08-31', getTodayString()] }, // 2 completions = 170 XP, 140 Ryo
    { ...initialMissions[2], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[4], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[5], isCompletedToday: false, completedDates: [] },
  ];

  const challengeWithCheckIn: ProtocolChallengeCycle = {
    id: 'cycle_1',
    cycleNumber: 1,
    startDate: '2026-08-30',
    status: 'active',
    currentDay: 3,
    daysCompleted: 2,
    checkIns: {
      1: { dayNumber: 1, date: '2026-08-30', checked: true, xpEarned: 100, targetXp: 100 },
      2: { dayNumber: 2, date: '2026-08-31', checked: true, xpEarned: 100, targetXp: 100 },
      3: { dayNumber: 3, date: getTodayString(), checked: false, xpEarned: 0, targetXp: 100 }, // unchecked / cancelled
    },
    totalXpEarned: 200,
    createdAt: '',
  };

  const resE = simulateRecalibration(multiDayMissions, challengeWithCheckIn);
  // Total XP = 50 (M1) + 170 (M2) = 220 XP. Level = 2.
  assert(resE.totalXp === 220, 'Cenário E: totalXp deve ser 220 (50 + 170)');
  assert(resE.level === 2, 'Cenário E: level deve ser 2');
  // Ryō = 30 (M1) + 140 (M2) + 70 (Level 2) + 40 (Check-in 1) + 40 (Check-in 2) = 320 Ryō
  assert(resE.ryo === 320, 'Cenário E: ryo deve ser 320 (30 + 140 + 70 + 40 + 40)');

  // Scenario F: Runtime Complete -> Level Up -> Cancel Mission -> Level Regression
  console.log('\n4. Testando Reversão em Tempo Real de Level Up e Ryō');
  let profileState: UserProfile = {
    id: 'user_1',
    name: 'Afonso',
    gender: 'male',
    ryo: 0,
    avatarConfig: { silhouette: 'shadow', outfit: 'tunic_dark', headband: 'iron_slate', auraColor: 'chakra' },
    level: 1,
    totalXp: 0,
    currentRankId: 'aspirante',
    pillarXp: { taijutsu: 0, ninjutsu: 0, chakra: 0, espirito: 0, genjutsu: 0 },
    currentProtocolDay: 1,
    currentStreak: 1,
    bestStreak: 1,
    weeklyShieldsRemaining: 1,
    weeklyShieldsMax: 1,
    lastActiveDate: getTodayString(),
    isHardModeEnabled: false,
    notificationSettings: { morningTime: '07:30', eveningTime: '21:00', enabled: true, soundEnabled: true },
    subscriptionStatus: 'trial',
    hasCompletedOnboarding: true,
    unlockedCards: [],
    equippedItems: [],
    inventory: [],
    createdAt: '',
  };

  // Simula conclusão de missão Rank B (140 XP, 130 Ryō)
  const baseXp = 140;
  const baseRyo = 130;
  const oldLevel = profileState.level;
  const newTotalXp = profileState.totalXp + baseXp;
  const newLevel = getLevelFromTotalXp(newTotalXp);
  const hasLeveledUp = newLevel > oldLevel;
  const levelUpRyo = hasLeveledUp ? getLevelUpRyoReward(newLevel) : 0;
  profileState = {
    ...profileState,
    totalXp: newTotalXp,
    level: newLevel,
    ryo: profileState.ryo + baseRyo + levelUpRyo, // 0 + 130 + 70 = 200
  };

  assert(profileState.totalXp === 140, 'Runtime Conclusão: totalXp deve ser 140');
  assert(profileState.level === 2, 'Runtime Conclusão: level deve ser 2');
  assert(profileState.ryo === 200, 'Runtime Conclusão: ryo deve ser 200');

  // Simula Cancelamento da missão Rank B
  const revertedTotalXp = Math.max(0, profileState.totalXp - baseXp);
  const revertedLevel = getLevelFromTotalXp(revertedTotalXp);
  let lostLevelUpRyo = 0;
  if (revertedLevel < profileState.level) {
    for (let lvl = profileState.level; lvl > revertedLevel; lvl--) {
      lostLevelUpRyo += getLevelUpRyoReward(lvl);
    }
  }
  const revertedRyo = Math.max(0, profileState.ryo - baseRyo - lostLevelUpRyo);
  profileState = {
    ...profileState,
    totalXp: revertedTotalXp,
    level: revertedLevel,
    ryo: revertedRyo,
  };

  assert(profileState.totalXp === 0, 'Runtime Cancelamento: totalXp deve voltar para 0');
  assert(profileState.level === 1, 'Runtime Cancelamento: level deve voltar para 1');
  assert(profileState.ryo === 0, 'Runtime Cancelamento: ryo deve voltar para 0 (sem bônus fantasma)');

  // Recalibra o estado
  const resF = simulateRecalibration(initialMissions);
  assert(resF.totalXp === profileState.totalXp, 'Recalibração bate 100% com o estado em tempo real após cancelamento (XP)');
  assert(resF.level === profileState.level, 'Recalibração bate 100% com o estado em tempo real após cancelamento (Level)');
  assert(resF.ryo === profileState.ryo, 'Recalibração bate 100% com o estado em tempo real após cancelamento (Ryō)');

  console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
}

runTests();
