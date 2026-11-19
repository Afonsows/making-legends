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
import { useChallengeStore, applyBoardFixes } from '../state/useChallengeStore';
import { originalAdversaries } from '../core/adversariesData';
import { getTodayString, addDaysToDateString } from '../core/dateUtils';
import { deriveTotals } from '../core/ledger';
import {
  BOARD_TEMPLATES,
  boardDayProgress,
  boardStats,
  cellKey,
  desiredBoardGrants,
  instantiateTemplate,
  rowActiveOn,
  sanitizeSections,
} from '../core/board';
import { UserChallenge } from '../core/types';

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
}

const affiliate = BOARD_TEMPLATES.find((t) => t.id === 'afiliado-40')!;

function makeBoard(startDate: string, marks: Record<string, string[]> = {}): UserChallenge {
  const { sections, milestones } = instantiateTemplate(affiliate, startDate);
  return {
    id: 'ch_test',
    title: affiliate.title,
    targetDays: 40,
    startDate,
    status: 'active',
    habits: [],
    createdAt: new Date().toISOString(),
    format: 'board',
    sections,
    marks,
    dailyGoalPct: 80,
    milestones,
  };
}

/** Todas as células obrigatórias do dia. */
const requiredKeys = (c: UserChallenge, date: string) => {
  const keys: string[] = [];
  (c.sections || []).forEach((s) =>
    s.rows.forEach((r) => {
      if (r.optional || !rowActiveOn(r, date)) return;
      if (s.kind === 'matrix') (s.columns || []).forEach((col) => keys.push(cellKey(s.id, r.id, col.id)));
      else keys.push(cellKey(s.id, r.id));
    })
  );
  return keys;
};

describe('quadro de operação: regras puras', () => {
  const thu = '2026-11-19'; // quinta-feira
  const sun = '2026-11-22'; // domingo

  it('modelo de afiliado: 3 relâmpago + 42 vídeos (Setup sem Pinterest) + 6 métricas; revisão semanal só no domingo', () => {
    const c = makeBoard(thu);
    expect(boardDayProgress(c, thu).total).toBe(51);
    expect(boardDayProgress(c, thu).optionalTotal).toBe(3);
    expect(boardDayProgress(c, sun).total).toBe(52);
    const cols = (id: string) => c.sections!.find((s) => s.id === id)!.columns!.map((col) => col.id);
    expect(cols('aps')).toEqual(['rev', 'tt', 'ig', 'yt']);
    expect(cols('apc')).toContain('pin');
    expect(cols('apm')).toContain('pin');
  });

  it('marcos fora do período não entram', () => {
    const { milestones } = instantiateTemplate(affiliate, '2026-11-28');
    expect(milestones.map((m) => m.label)).toEqual(['Cyber Monday', '12.12', 'Natal']);
  });

  it('dia cumprido com 80% das obrigatórias; extras não contam para a meta', () => {
    const c = makeBoard(thu);
    const req = requiredKeys(c, thu);
    const needed = Math.ceil(req.length * 0.8);
    const almost = makeBoard(thu, { [thu]: [...req.slice(0, needed - 1), 'cur.p1', 'cur.p2', 'cur.p3'] });
    expect(boardDayProgress(almost, thu).completed).toBe(false);
    expect(boardDayProgress(almost, thu).remainingToGoal).toBe(1);
    const done = makeBoard(thu, { [thu]: req.slice(0, needed) });
    expect(boardDayProgress(done, thu).completed).toBe(true);
  });

  it('marcações de linhas removidas são ignoradas', () => {
    const c = makeBoard(thu, { [thu]: ['fantasma.x', 'rel.casa'] });
    expect(boardDayProgress(c, thu).done).toBe(1);
  });

  it('sequência, faltas e adesão; hoje em andamento não quebra a sequência', () => {
    const d1 = thu;
    const d2 = '2026-11-20';
    const d3 = '2026-11-21';
    const base = makeBoard(d1);
    const c = makeBoard(d1, { [d1]: requiredKeys(base, d1), [d2]: requiredKeys(base, d2) });
    const s = boardStats(c, d3);
    expect(s.dayNumber).toBe(3);
    expect(s.daysCompleted).toBe(2);
    expect(s.daysMissed).toBe(0);
    expect(s.streak).toBe(2);
    expect(s.adherence).toBe(67); // 100 + 100 + 0
    expect(s.nextMilestone?.label).toBe('Black Friday');
    expect(s.nextMilestone?.inDays).toBe(6);

    const later = boardStats(c, '2026-11-22');
    expect(later.daysMissed).toBe(1);
    expect(later.streak).toBe(0);
    expect(later.bestStreak).toBe(2);
  });

  it('recompensas desejadas: célula, seção completa e dia cumprido', () => {
    const c = makeBoard(thu, { [thu]: ['rel.casa', 'rel.mim', 'rel.setup', 'apc.v1.rev'] });
    const grants = desiredBoardGrants(c, thu);
    expect(grants.filter((g) => g.kind === 'cell')).toHaveLength(4);
    expect(grants.filter((g) => g.kind === 'section').map((g) => g.key)).toEqual([`board:ch_test:${thu}:s:rel`]);
    expect(grants.some((g) => g.kind === 'day')).toBe(false);
  });

  it('seção só de extras fica completa quando todas as extras são marcadas', () => {
    const c = makeBoard(thu, { [thu]: ['cur.p1', 'cur.p2', 'cur.p3'] });
    expect(desiredBoardGrants(c, thu).some((g) => g.key.endsWith(':s:cur'))).toBe(true);
  });

  it('sanitizeSections tira linhas vazias e normaliza dias da semana', () => {
    const out = sanitizeSections([
      {
        id: 's',
        title: '  Lista ',
        kind: 'list',
        rows: [
          { id: 'a', label: ' A ', weekdays: [0, 1, 2, 3, 4, 5, 6] },
          { id: 'b', label: '   ' },
          { id: 'c', label: 'C', weekdays: [3, 1, 3] },
        ],
      },
      { id: 'vazia', title: ' ', kind: 'list', rows: [] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Lista');
    expect(out[0].rows).toEqual([
      { id: 'a', label: 'A' },
      { id: 'c', label: 'C', weekdays: [1, 3] },
    ]);
  });
});

describe('quadro de operação: loja e recompensas', () => {
  beforeEach(resetAll);

  const xp = () => deriveTotals(useUserStore.getState().profile.grants).totalXp;
  const boardGrantKeys = () => Object.keys(useUserStore.getState().profile.grants).filter((k) => k.startsWith('board:'));

  it('cria pelo modelo começando hoje, com o quadro aberto', () => {
    const ch = useChallengeStore.getState().createBoardChallenge('afiliado-40')!;
    expect(ch.startDate).toBe(getTodayString());
    expect(ch.format).toBe('board');
    expect(ch.sections).toHaveLength(6);
    expect(useChallengeStore.getState().isDetailModalOpen).toBe(true);
  });

  it('marcar e desmarcar devolve exatamente o XP; seção completa e dia cumprido pagam bônus', () => {
    const ch = useChallengeStore.getState().createBoardChallenge('afiliado-40')!;
    const today = getTodayString();
    const before = xp();

    useChallengeStore.getState().toggleBoardCells(ch.id, ['rel.casa'], today);
    expect(boardGrantKeys()).toHaveLength(1);
    useChallengeStore.getState().toggleBoardCells(ch.id, ['rel.mim', 'rel.setup'], today);
    expect(boardGrantKeys()).toContain(`board:${ch.id}:${today}:s:rel`);

    const all = requiredKeys(useChallengeStore.getState().challenges[0], today);
    useChallengeStore.getState().toggleBoardCells(ch.id, all, today, true);
    expect(boardGrantKeys()).toContain(`board:${ch.id}:${today}:day`);
    expect(xp()).toBeGreaterThan(before);

    useChallengeStore.getState().toggleBoardCells(ch.id, all, today, false);
    expect(boardGrantKeys()).toHaveLength(0);
    expect(xp()).toBe(before);
  });

  it('dia passado corrige o registro sem pagar; futuro é bloqueado', () => {
    const today = getTodayString();
    const ch = useChallengeStore.getState().createBoardChallenge('afiliado-40', { startDate: addDaysToDateString(today, -2) })!;
    const yesterday = addDaysToDateString(today, -1);
    const res = useChallengeStore.getState().toggleBoardCells(ch.id, ['rel.casa'], yesterday);
    expect(res.blockedReason).toBeUndefined();
    expect(useChallengeStore.getState().challenges[0].marks?.[yesterday]).toEqual(['rel.casa']);
    expect(boardGrantKeys()).toHaveLength(0);

    const future = useChallengeStore.getState().toggleBoardCells(ch.id, ['rel.casa'], addDaysToDateString(today, 1));
    expect(future.blockedReason).toBeTruthy();
  });

  it('remover uma linha marcada hoje estorna a recompensa dela', () => {
    const ch = useChallengeStore.getState().createBoardChallenge('afiliado-40')!;
    const today = getTodayString();
    const before = xp();
    useChallengeStore.getState().toggleBoardCells(ch.id, ['met.ml'], today);
    expect(xp()).toBeGreaterThan(before);
    const sections = useChallengeStore
      .getState()
      .challenges[0].sections!.map((s) => (s.id === 'met' ? { ...s, rows: s.rows.filter((r) => r.id !== 'ml') } : s));
    useChallengeStore.getState().updateBoard(ch.id, { sections });
    expect(xp()).toBe(before);
  });

  it('quadro antigo perde o Pinterest do Setup uma vez só, com estorno; Casa e pra Mim mantêm', () => {
    const ch = useChallengeStore.getState().createBoardChallenge('afiliado-40')!;
    const today = getTodayString();
    // Simula o quadro criado antes do ajuste: Setup com Pinterest e sem a marca do ajuste
    useChallengeStore.setState((s) => ({
      challenges: s.challenges.map((c) => ({
        ...c,
        boardFixes: undefined,
        sections: c.sections!.map((sec) =>
          sec.id === 'aps' ? { ...sec, columns: [...sec.columns!, { id: 'pin', label: 'Pinterest' }] } : sec
        ),
      })),
    }));
    const before = xp();
    useChallengeStore.getState().toggleBoardCells(ch.id, ['aps.v1.pin'], today);
    expect(xp()).toBeGreaterThan(before);

    applyBoardFixes();
    const fixed = useChallengeStore.getState().challenges[0];
    const cols = (id: string) => fixed.sections!.find((s) => s.id === id)!.columns!.map((c) => c.id);
    expect(cols('aps')).toEqual(['rev', 'tt', 'ig', 'yt']);
    expect(cols('apc')).toContain('pin');
    expect(cols('apm')).toContain('pin');
    expect(fixed.boardFixes).toEqual(['afiliado-aps-sem-pinterest']);
    expect(xp()).toBe(before);

    // Se o dono devolver o Pinterest depois, o ajuste não o tira de novo
    useChallengeStore.getState().updateBoard(ch.id, {
      sections: fixed.sections!.map((sec) =>
        sec.id === 'aps' ? { ...sec, columns: [...sec.columns!, { id: 'pin', label: 'Pinterest' }] } : sec
      ),
    });
    applyBoardFixes();
    expect(useChallengeStore.getState().challenges[0].sections!.find((s) => s.id === 'aps')!.columns).toHaveLength(5);
  });

  it('excluir o quadro estorna tudo o que ele deu', () => {
    const ch = useChallengeStore.getState().createBoardChallenge('afiliado-40')!;
    const before = xp();
    useChallengeStore.getState().toggleBoardCells(ch.id, ['rel.casa', 'rel.mim', 'rel.setup'], getTodayString());
    useChallengeStore.getState().deleteChallenge(ch.id);
    expect(xp()).toBe(before);
  });
});
