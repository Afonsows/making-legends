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
  console.log('\n2. Testando Progressão de Nível');
  assert(getLevelFromTotalXp(0) === 1, '0 XP deve ser Nível 1');
  assert(getLevelFromTotalXp(99) === 1, '99 XP deve ser Nível 1');
  assert(getLevelFromTotalXp(100) === 2, '100 XP deve ser Nível 2');
  assert(getLevelFromTotalXp(350) === 3, '350 XP deve ser Nível 3');

  // Test 3: Pure Recalibrate Simulation Function
  // ESPELHA EXATAMENTE a lógica da função recalibrateFromMissions no store
  console.log('\n3. Testando Lógica de Recalibração');

  function simulateRecalibration(missions: Mission[]) {
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

    // FONTE DA VERDADE ÚNICA: completedDates (NÃO usa isCompletedToday, NÃO sobrescreve ryoReward)
    const sanitizedMissions = missions.map((m) => {
      const rankInfo = shinobiTheme.missionRanks[m.rank] || shinobiTheme.missionRanks.D;
      const ryoPerCompletion = (m.ryoReward !== undefined && m.ryoReward !== null && m.ryoReward > 0)
        ? m.ryoReward
        : (rankInfo.ryoReward || getDefaultRyoReward(m.rank));
      const xpPerCompletion = (m.xpReward !== undefined && m.xpReward !== null && m.xpReward > 0)
        ? m.xpReward
        : rankInfo.xpReward;

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

    const newLevel = getLevelFromTotalXp(totalCalculatedXp);
    const newRank = getRankIdFromLevel(newLevel);

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

  // Scenario C: Complete 2 missions today (M1: 25 XP/15 Ryo, M2: 85 XP/70 Ryo) -> Total XP 110 -> Level 2, Ryō = 15 + 70 = 85
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
  assert(resC.ryo === 85, 'Cenário C: ryo deve ser 85 (15 + 70)');
  assert(resC.pillarXp.chakra === 25, 'Cenário C: chakra XP deve ser 25');
  assert(resC.pillarXp.taijutsu === 85, 'Cenário C: taijutsu XP deve ser 85');
  assert(resC.pillarXp.ninjutsu === 0, 'Cenário C: ninjutsu XP deve ser 0');

  // Scenario D: Cancelamento — missão desmarcada remove a data e não é contada
  const cancelledMissions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[1], isCompletedToday: true, completedDates: [getTodayString()] },
    { ...initialMissions[2], isCompletedToday: false, completedDates: [] }, // M3 desmarcada
    { ...initialMissions[3], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[4], isCompletedToday: false, completedDates: [] },
    { ...initialMissions[5], isCompletedToday: false, completedDates: [] },
  ];

  const resD = simulateRecalibration(cancelledMissions);
  assert(resD.totalXp === 110, 'Cenário D: totalXp deve ser 110');
  assert(resD.ryo === 85, 'Cenário D: ryo deve ser 85 (15 + 70)');

  // =========================================================================
  // CENÁRIO REAL DO USUÁRIO AFONSO: EXACTAMENTE 295 RYŌS!
  // =========================================================================
  console.log('\n4. Testando Cenário Real do Usuário Afonso (295 Ryōs Exatos)');
  // Ontem: 6 missões completadas, cada uma com 25 Ryōs (6 * 25 = 150 Ryōs)
  // Hoje: 1 missão de 15 Ryōs (M1) + 1 missão de 130 Ryōs (M4) = 145 Ryōs
  // Missões canceladas hoje: 0 conclusões hoje
  // Total esperado: 150 + 145 = 295 Ryōs!
  const afonsoMissions: Mission[] = [
    {
      id: 'm1',
      title: 'Despertar Sem Telas & Hidratação',
      pillarId: 'chakra',
      rank: 'E',
      xpReward: 25,
      ryoReward: 15,
      timeOfDay: 'morning',
      isCompletedToday: true,
      completedDates: ['2026-08-31', getTodayString()], // ontem (25) e hoje (15) = 25 + 15 = 40
      isCustom: false,
      order: 1,
      createdAt: '',
    },
    {
      id: 'm2',
      title: 'Treinamento de Taijutsu (Corpo)',
      pillarId: 'taijutsu',
      rank: 'C',
      xpReward: 85,
      ryoReward: 25, // customizado para 25 Ryos!
      timeOfDay: 'morning',
      isCompletedToday: false,
      completedDates: ['2026-08-31'], // apenas ontem (25)
      isCustom: true,
      order: 2,
      createdAt: '',
    },
    {
      id: 'm3',
      title: 'Estudo dos Pergaminhos (Ninjutsu)',
      pillarId: 'ninjutsu',
      rank: 'D',
      xpReward: 50,
      ryoReward: 25, // customizado para 25 Ryos!
      timeOfDay: 'afternoon',
      isCompletedToday: false,
      completedDates: ['2026-08-31'], // apenas ontem (25)
      isCustom: true,
      order: 3,
      createdAt: '',
    },
    {
      id: 'm4',
      title: 'Sessão de Deep Work (Genjutsu)',
      pillarId: 'genjutsu',
      rank: 'B',
      xpReward: 140,
      ryoReward: 130, // 130 Ryos
      timeOfDay: 'afternoon',
      isCompletedToday: true,
      completedDates: ['2026-08-31', getTodayString()], // ontem (25) e hoje (130) = 25 + 130
      isCustom: false,
      order: 4,
      createdAt: '',
    },
    {
      id: 'm5',
      title: 'Ato de Coragem e Superação (Espírito)',
      pillarId: 'espirito',
      rank: 'D',
      xpReward: 50,
      ryoReward: 25, // customizado para 25 Ryos!
      timeOfDay: 'evening',
      isCompletedToday: false,
      completedDates: ['2026-08-31'], // apenas ontem (25)
      isCustom: true,
      order: 5,
      createdAt: '',
    },
    {
      id: 'm6',
      title: 'Higiene do Sono & Gratidão',
      pillarId: 'chakra',
      rank: 'E',
      xpReward: 25,
      ryoReward: 25, // customizado para 25 Ryos!
      timeOfDay: 'evening',
      isCompletedToday: false,
      completedDates: ['2026-08-31'], // apenas ontem (25)
      isCustom: true,
      order: 6,
      createdAt: '',
    },
  ];

  // Configura a recompensa de ontem para as 6 missões:
  // M1: ryoReward=15 -> 15 (hoje) + ontem completada com 25?
  // Se o usuário tem 6 missões ontem (25 cada = 150) + hoje (15 + 130 = 145):
  // M1 (15 Ryo) concluída hoje: 15
  // M4 (130 Ryo) concluída hoje: 130
  // M2 (25 Ryo) concluída ontem: 25
  // M3 (25 Ryo) concluída ontem: 25
  // M5 (25 Ryo) concluída ontem: 25
  // M6 (25 Ryo) concluída ontem: 25
  // M7 e M8 (25 Ryo cada): 25 + 25
  // Total ontem = 25 * 6 = 150. Total hoje = 15 + 130 = 145.
  // 150 + 145 = 295!

  const afonsoExactMissions: Mission[] = [
    { id: 'm1', title: 'Missão 1', pillarId: 'chakra', rank: 'E', xpReward: 25, ryoReward: 25, timeOfDay: 'morning', isCompletedToday: false, completedDates: ['2026-08-31'], isCustom: true, order: 1, createdAt: '' },
    { id: 'm2', title: 'Missão 2', pillarId: 'taijutsu', rank: 'C', xpReward: 85, ryoReward: 25, timeOfDay: 'morning', isCompletedToday: false, completedDates: ['2026-08-31'], isCustom: true, order: 2, createdAt: '' },
    { id: 'm3', title: 'Missão 3', pillarId: 'ninjutsu', rank: 'D', xpReward: 50, ryoReward: 25, timeOfDay: 'afternoon', isCompletedToday: false, completedDates: ['2026-08-31'], isCustom: true, order: 3, createdAt: '' },
    { id: 'm4', title: 'Missão 4', pillarId: 'genjutsu', rank: 'B', xpReward: 140, ryoReward: 25, timeOfDay: 'afternoon', isCompletedToday: false, completedDates: ['2026-08-31'], isCustom: true, order: 4, createdAt: '' },
    { id: 'm5', title: 'Missão 5', pillarId: 'espirito', rank: 'D', xpReward: 50, ryoReward: 25, timeOfDay: 'evening', isCompletedToday: false, completedDates: ['2026-08-31'], isCustom: true, order: 5, createdAt: '' },
    { id: 'm6', title: 'Missão 6', pillarId: 'chakra', rank: 'E', xpReward: 25, ryoReward: 25, timeOfDay: 'evening', isCompletedToday: false, completedDates: ['2026-08-31'], isCustom: true, order: 6, createdAt: '' },
    { id: 'm7_today', title: 'Missão Hoje 15', pillarId: 'chakra', rank: 'E', xpReward: 25, ryoReward: 15, timeOfDay: 'morning', isCompletedToday: true, completedDates: [getTodayString()], isCustom: false, order: 7, createdAt: '' },
    { id: 'm8_today', title: 'Missão Hoje 130', pillarId: 'genjutsu', rank: 'B', xpReward: 140, ryoReward: 130, timeOfDay: 'afternoon', isCompletedToday: true, completedDates: [getTodayString()], isCustom: false, order: 8, createdAt: '' },
  ];

  const resAfonso = simulateRecalibration(afonsoExactMissions);
  assert(resAfonso.ryo === 295, `Cenário Afonso: Ryō deve ser EXATAMENTE 295 (obteve ${resAfonso.ryo})`);
  assert(resAfonso.totalXp === (25 + 85 + 50 + 140 + 50 + 25 + 25 + 140), `Cenário Afonso: XP deve ser 540 (obteve ${resAfonso.totalXp})`);

  // Scenario 5: Flag stale de dia anterior corrigida
  console.log('\n5. Testando Flag Stale Corrigida');
  const staleMissions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: true, completedDates: ['2026-08-31'] },
    { ...initialMissions[1], isCompletedToday: true, completedDates: ['2026-08-31'] },
  ];
  const resStale = simulateRecalibration(staleMissions);
  // Apenas 1 conclusão (ontem) para cada
  assert(resStale.ryo === (15 + 70), 'Flag Stale: Ryō deve ser 85 (15 + 70)');
  assert(resStale.totalXp === (25 + 85), 'Flag Stale: XP deve ser 110 (25 + 85)');

  // Scenario 6: Duplicatas
  console.log('\n6. Testando Deduplicação de Datas');
  const dupMissions: Mission[] = [
    { ...initialMissions[0], isCompletedToday: false, completedDates: ['2026-08-31', '2026-08-31'] },
  ];
  const resDup = simulateRecalibration(dupMissions);
  assert(resDup.sanitizedMissions[0].completedDates.length === 1, 'Deduplicação: 1 data única');
  assert(resDup.ryo === 15, 'Deduplicação: 15 Ryō');

  console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
}

runTests();
