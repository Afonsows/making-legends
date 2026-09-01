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
  // ESPELHA EXATAMENTE a lógica da função recalibrateFromMissions no store
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

    // FONTE DA VERDADE ÚNICA: completedDates (NÃO usa isCompletedToday)
    const sanitizedMissions = missions.map((m) => {
      const rankInfo = shinobiTheme.missionRanks[m.rank] || shinobiTheme.missionRanks.D;
      const ryoPerCompletion = (!m.isCustom || !m.ryoReward || (m.ryoReward === 25 && m.rank !== 'E'))
        ? (rankInfo.ryoReward || getDefaultRyoReward(m.rank))
        : m.ryoReward;
      const xpPerCompletion = (!m.isCustom || !m.xpReward)
        ? rankInfo.xpReward
        : m.xpReward;

      // Filtra datas válidas sem depender de isCompletedToday
      const validDates = (m.completedDates || []).filter(
        (d) => typeof d === 'string' && isValidDateString(d) && d <= todayStr
      );

      // Deduplicação e ordenação
      const uniqueDates = Array.from(new Set<string>(validDates)).sort();
      const isTodayCompleted = uniqueDates.includes(todayStr);
      const netCompletions = uniqueDates.length;

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
        isCompletedToday: isTodayCompleted,
        completedDates: uniqueDates,
      };
    });

    let totalCheckInRyo = 0;
    const allCycles = [activeChallenge, ...challengeHistory].filter(Boolean) as ProtocolChallengeCycle[];
    allCycles.forEach((cycle) => {
      if (cycle?.checkIns) {
        Object.values(cycle.checkIns).forEach((checkIn) => {
          if (checkIn && checkIn.checked) {
            const checkInBonus = getDailyCheckInRyoBonus(1, 1);
            totalCheckInRyo += checkInBonus;
          }
        });
      }
    });
    totalCalculatedRyo += totalCheckInRyo;

    const newLevel = getLevelFromTotalXp(totalCalculatedXp);
    const newRank = getRankIdFromLevel(newLevel);

    let totalLevelUpRyo = 0;
    for (let lvl = 2; lvl <= newLevel; lvl++) {
      totalLevelUpRyo += getLevelUpRyoReward(lvl);
    }
    totalCalculatedRyo += totalLevelUpRyo;

    return {
      totalXp: totalCalculatedXp,
      level: newLevel,
      rank: newRank,
      ryo: totalCalculatedRyo,
      pillarXp: pillarXpMap,
      sanitizedMissions,
      audit: {
        ryoMissoes: totalCalculatedRyo - totalCheckInRyo - totalLevelUpRyo,
        ryoCheckIns: totalCheckInRyo,
        ryoLevelUps: totalLevelUpRyo,
      },
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
  // completedDates still has todayStr (race condition) — recalibração deve confiar em completedDates, não na flag
  const cancelledM3Missions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[1], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[2], isCompletedToday: false, completedDates: [getTodayString()] }, // flag diz cancelado, mas data ainda está!
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[4], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[5], isCompletedToday: false, completedDates: [] },
  ];

  const resD = simulateRecalibration(cancelledM3Missions);
  // NOTA: A nova lógica confia em completedDates. Como todayStr AINDA está em completedDates da M3,
  // ela É contada. O resultado correto é: a data em completedDates é a fonte da verdade.
  // Se o toggleCompleteMission removeu a data ao cancelar, ela não estaria aqui.
  // Se ela está aqui, é porque a missão foi concluída (possível inconsistência de dados).
  assert(resD.totalXp === 160, 'Cenário D (Data em completedDates): totalXp deve ser 160 (25 + 85 + 50)');
  assert(resD.level === 2, 'Cenário D: level deve ser 2');
  assert(resD.ryo === 190, 'Cenário D: ryo deve ser 190 (15 + 70 + 35 + 70 level-up)');

  // Scenario D2: Cancelamento CORRETO — todayStr foi REMOVIDO de completedDates pela toggleCompleteMission
  const correctlyCancelledM3: Mission[] = [
    { ...initialMissions[0], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[1], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[2], isCompletedToday: false, completedDates: [] }, // corretamente cancelado
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[4], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[5], isCompletedToday: false, completedDates: [] },
  ];

  const resD2 = simulateRecalibration(correctlyCancelledM3);
  assert(resD2.totalXp === 110, 'Cenário D2 (Cancelamento correto): totalXp deve ser 110');
  assert(resD2.ryo === 155, 'Cenário D2 (Cancelamento correto): ryo deve ser 155');

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
  assert(resE.audit.ryoCheckIns === 80, 'Cenário E: check-in Ryō deve ser 80 (2 × 40)');
  assert(resE.audit.ryoLevelUps === 70, 'Cenário E: level-up Ryō deve ser 70');

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

  // ==========================================
  // NOVOS CENÁRIOS DE TESTE
  // ==========================================

  console.log('\n5. Testando BUG CORRIGIDO: isCompletedToday stale de dia anterior');

  // Scenario G: isCompletedToday STALE — flag true de ontem, mas completedDates NÃO tem hoje
  // Este era o BUG PRINCIPAL! A flag isCompletedToday ficava true de ontem, e a recalibração
  // adicionava o dia de hoje como conclusão fantasma.
  const staleMissions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: true, completedDates: ['2026-08-31'] }, // STALE! flag true, mas data é de ontem
    { ...initialMissions[1], isCompletedToday: true, completedDates: ['2026-08-31'] }, // STALE!
    { ...initialMissions[2], isCompletedToday: true, completedDates: ['2026-08-31'] }, // STALE!
    { ...initialMissions[3], isCompletedToday: true, completedDates: ['2026-08-31'] }, // STALE!
    { ...initialMissions[4], isCompletedToday: true, completedDates: ['2026-08-31'] }, // STALE!
    { ...initialMissions[5], isCompletedToday: true, completedDates: ['2026-08-31'] }, // STALE!
  ];

  const resG = simulateRecalibration(staleMissions);
  // CORRETO: Cada missão tem 1 conclusão (ontem, 2026-08-31). Não deve contar hoje!
  // XP total: 25 + 85 + 50 + 140 + 50 + 25 = 375. Level 3 (375 > 321).
  // Ryō missões: 15 + 70 + 35 + 130 + 35 + 15 = 300
  // Ryō level-up: 70 (nível 2) + 80 (nível 3) = 150
  // Total Ryō: 300 + 150 = 450
  assert(resG.totalXp === 375, 'Cenário G (Flag stale): totalXp deve ser 375 (apenas 1 dia × 6 missões)');
  assert(resG.level === 3, 'Cenário G (Flag stale): level deve ser 3');
  assert(resG.ryo === 450, 'Cenário G (Flag stale): ryo deve ser 450 (300 missões + 150 level-up)');
  // Verificação crucial: nenhuma missão deve ter isCompletedToday = true após sanitização
  assert(resG.sanitizedMissions.every((m) => m.isCompletedToday === false),
    'Cenário G: TODAS as missões devem ter isCompletedToday = false (stale corrigido)');
  assert(resG.sanitizedMissions.every((m) => m.completedDates.length === 1),
    'Cenário G: CADA missão deve ter exatamente 1 data (ontem)');

  // BUG ANTIGO: com a lógica antiga, cada missão teria 2 conclusões (ontem + hoje fantasma)
  // XP antigo errado: 750. Ryō antigo errado: 600 + level-ups extras.
  // O teste G garante que isso NÃO acontece mais.

  console.log('\n6. Testando datas duplicadas em completedDates');

  // Scenario H: completedDates tem duplicatas
  const duplicateMissions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: false, completedDates: ['2026-08-30', '2026-08-30', '2026-08-31', '2026-08-31'] },
    { ...initialMissions[1], isCompletedToday: false, completedDates: ['2026-08-30', '2026-08-30'] },
    { ...initialMissions[2], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[4], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[5], isCompletedToday: false, completedDates: [] },
  ];

  const resH = simulateRecalibration(duplicateMissions);
  // M1: 2 datas únicas (30 e 31) = 50 XP, 30 Ryō
  // M2: 1 data única (30) = 85 XP, 70 Ryō
  assert(resH.totalXp === 135, 'Cenário H (Duplicatas): totalXp deve ser 135 (50 + 85)');
  assert(resH.ryo === 170, 'Cenário H (Duplicatas): ryo deve ser 170 (30 + 70 + 70 level-up)');
  assert(resH.sanitizedMissions[0].completedDates.length === 2, 'Cenário H: M1 deve ter 2 datas únicas');
  assert(resH.sanitizedMissions[1].completedDates.length === 1, 'Cenário H: M2 deve ter 1 data única');

  console.log('\n7. Testando check-ins com ciclos arquivados');

  // Scenario I: Challenge history com ciclo arquivado — check-ins cancelados não devem contar
  const archivedCycle: ProtocolChallengeCycle = {
    id: 'cycle_old',
    cycleNumber: 1,
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    status: 'failed',
    currentDay: 15,
    daysCompleted: 5,
    failedWeek: 3,
    failedReason: '2 dias sem presença na Semana 3',
    checkIns: {
      1: { dayNumber: 1, date: '2026-07-01', checked: true, xpEarned: 100, targetXp: 100 },
      2: { dayNumber: 2, date: '2026-07-02', checked: true, xpEarned: 100, targetXp: 100 },
      3: { dayNumber: 3, date: '2026-07-03', checked: false, xpEarned: 0, targetXp: 100 }, // faltou
      4: { dayNumber: 4, date: '2026-07-04', checked: true, xpEarned: 100, targetXp: 100 },
      5: { dayNumber: 5, date: '2026-07-05', checked: false, xpEarned: 0, targetXp: 100 }, // faltou
    },
    totalXpEarned: 300,
    createdAt: '',
  };

  const activeCycle: ProtocolChallengeCycle = {
    id: 'cycle_2',
    cycleNumber: 2,
    startDate: '2026-08-01',
    status: 'active',
    currentDay: 5,
    daysCompleted: 3,
    checkIns: {
      1: { dayNumber: 1, date: '2026-08-01', checked: true, xpEarned: 100, targetXp: 100 },
      2: { dayNumber: 2, date: '2026-08-02', checked: true, xpEarned: 100, targetXp: 100 },
      3: { dayNumber: 3, date: '2026-08-03', checked: true, xpEarned: 100, targetXp: 100 },
      4: { dayNumber: 4, date: '2026-08-04', checked: false, xpEarned: 0, targetXp: 100 }, // cancelado
    },
    totalXpEarned: 300,
    createdAt: '',
  };

  const resI = simulateRecalibration(initialMissions, activeCycle, [archivedCycle]);
  // Missões: 0 XP, 0 Ryō (nenhuma conclusão)
  // Check-ins: ciclo arquivado tem 3 checked + ciclo ativo tem 3 checked = 6 × 40 = 240 Ryō
  // Faltas (checked: false) NÃO contam!
  assert(resI.totalXp === 0, 'Cenário I (Ciclos múltiplos): totalXp deve ser 0');
  assert(resI.ryo === 240, 'Cenário I: ryo deve ser 240 (6 check-ins × 40)');
  assert(resI.audit.ryoCheckIns === 240, 'Cenário I: ryoCheckIns deve ser 240');
  assert(resI.audit.ryoLevelUps === 0, 'Cenário I: ryoLevelUps deve ser 0');

  console.log('\n8. Testando missão concluída e cancelada no mesmo dia (fluxo real)');

  // Scenario J: Conclusão e cancelamento no mesmo dia — completedDates limpo
  const sameDay: Mission[] = [
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] }, // M4 concluída e cancelada — data removida
    { ...initialMissions[0], isCompletedToday: true, completedDates: [getTodayString()] }, // M1 concluída e mantida
    ...initialMissions.slice(1, 3).map(m => ({ ...m })),
    ...initialMissions.slice(4).map(m => ({ ...m })),
  ];

  const resJ = simulateRecalibration(sameDay);
  // M4: 0 completions (cancelada, data removida)
  // M1: 1 completion = 25 XP, 15 Ryō
  assert(resJ.totalXp === 25, 'Cenário J (Cancelamento mesmo dia): totalXp deve ser 25');
  assert(resJ.ryo === 15, 'Cenário J: ryo deve ser 15 (sem level-up, nível 1)');

  console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
}

runTests();
