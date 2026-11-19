import { BoardMilestone, BoardRow, BoardSection, UserChallenge } from './types';
import { PillarId } from '../theme/types';
import { addDaysToDateString, daysBetween, isValidDateString, parseDate } from './dateUtils';

/**
 * QUADRO DE OPERAÇÃO
 * ─────────────────────────────────────────────────────────────
 * Formato de desafio pensado para rotinas com muitas tarefas por dia.
 * Em vez de um cartão por hábito, o quadro tem seções compactas:
 *  - lista: uma tarefa por linha;
 *  - tabela: linhas × colunas (ex.: vídeo × rede social).
 *
 * Tudo aqui é função pura: o progresso, a sequência e as recompensas
 * desejadas para o dia são sempre recalculados a partir das marcações.
 */

export const DEFAULT_DAILY_GOAL_PCT = 80;

/** Recompensas do quadro (por célula, por seção completa e pelo dia cumprido). */
export const BOARD_CELL_XP = 5;
export const BOARD_CELL_RYO = 3;
export const BOARD_SECTION_XP = 25;
export const BOARD_SECTION_RYO = 15;
export const BOARD_DAY_XP = 60;
export const BOARD_DAY_RYO = 40;

export const isBoard = (c?: Pick<UserChallenge, 'format'> | null): boolean => c?.format === 'board';

export const boardEndDate = (c: Pick<UserChallenge, 'startDate' | 'targetDays'>): string =>
  addDaysToDateString(c.startDate, Math.max(1, c.targetDays) - 1);

export const goalPctOf = (c: Pick<UserChallenge, 'dailyGoalPct'>): number => {
  const pct = Math.round(Number(c.dailyGoalPct));
  return pct >= 1 && pct <= 100 ? pct : DEFAULT_DAILY_GOAL_PCT;
};

export function cellKey(sectionId: string, rowId: string, colId?: string): string {
  return colId ? `${sectionId}.${rowId}.${colId}` : `${sectionId}.${rowId}`;
}

export function rowActiveOn(row: BoardRow, date: string): boolean {
  if (!row.weekdays || row.weekdays.length === 0 || row.weekdays.length >= 7) return true;
  return row.weekdays.includes(parseDate(date).getDay());
}

export interface BoardCell {
  key: string;
  sectionId: string;
  rowId: string;
  colId?: string;
  optional: boolean;
}

/** Células que existem em uma seção em uma data (respeitando os dias da semana de cada linha). */
export function sectionCells(section: BoardSection, date: string): BoardCell[] {
  const out: BoardCell[] = [];
  section.rows.forEach((row) => {
    if (!rowActiveOn(row, date)) return;
    if (section.kind === 'matrix') {
      (section.columns || []).forEach((col) =>
        out.push({ key: cellKey(section.id, row.id, col.id), sectionId: section.id, rowId: row.id, colId: col.id, optional: Boolean(row.optional) })
      );
    } else {
      out.push({ key: cellKey(section.id, row.id), sectionId: section.id, rowId: row.id, optional: Boolean(row.optional) });
    }
  });
  return out;
}

export function boardCells(c: Pick<UserChallenge, 'sections'>, date: string): BoardCell[] {
  return (c.sections || []).flatMap((s) => sectionCells(s, date));
}

export function marksOn(c: Pick<UserChallenge, 'marks'>, date: string): Set<string> {
  return new Set(c.marks?.[date] || []);
}

export interface SectionProgress {
  done: number;
  total: number;
  /** Todas as células obrigatórias (ou todas, se a seção só tiver opcionais) estão marcadas. */
  complete: boolean;
}

export function sectionProgress(section: BoardSection, marks: Set<string>, date: string): SectionProgress {
  const cells = sectionCells(section, date);
  const required = cells.filter((c) => !c.optional);
  const basis = required.length > 0 ? required : cells;
  return {
    done: cells.filter((c) => marks.has(c.key)).length,
    total: cells.length,
    complete: basis.length > 0 && basis.every((c) => marks.has(c.key)),
  };
}

export interface BoardDayProgress {
  /** Obrigatórias marcadas / obrigatórias do dia. */
  done: number;
  total: number;
  optionalDone: number;
  optionalTotal: number;
  /** % das obrigatórias (0 a 100). */
  pct: number;
  /** Quantas obrigatórias faltam para bater a meta. */
  remainingToGoal: number;
  completed: boolean;
}

export function boardDayProgress(c: Pick<UserChallenge, 'sections' | 'marks' | 'dailyGoalPct'>, date: string): BoardDayProgress {
  const cells = boardCells(c, date);
  const marks = marksOn(c, date);
  const required = cells.filter((x) => !x.optional);
  const optional = cells.filter((x) => x.optional);
  const done = required.filter((x) => marks.has(x.key)).length;
  const total = required.length;
  const needed = Math.ceil((total * goalPctOf(c)) / 100);
  return {
    done,
    total,
    optionalDone: optional.filter((x) => marks.has(x.key)).length,
    optionalTotal: optional.length,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
    remainingToGoal: Math.max(0, needed - done),
    completed: total > 0 && done >= needed,
  };
}

export type BoardPhase = 'Despertar' | 'Forja' | 'Mestria';

export interface BoardStats {
  /** Dia corrente do desafio (0 = ainda não começou). */
  dayNumber: number;
  targetDays: number;
  phase: BoardPhase;
  /** % do desafio percorrido (por dias). */
  timePct: number;
  daysCompleted: number;
  /** Dias já encerrados que não bateram a meta. */
  daysMissed: number;
  streak: number;
  bestStreak: number;
  /** Média do % obrigatório nos dias já vividos (hoje incluso). */
  adherence: number;
  remaining: number;
  today: BoardDayProgress;
  nextMilestone?: BoardMilestone & { inDays: number };
}

export function boardPhase(dayNumber: number, targetDays: number): BoardPhase {
  const third = Math.max(1, Math.ceil(targetDays / 3));
  if (dayNumber <= third) return 'Despertar';
  if (dayNumber <= third * 2) return 'Forja';
  return 'Mestria';
}

export function boardStats(c: UserChallenge, today: string): BoardStats {
  const end = boardEndDate(c);
  const elapsedRaw = daysBetween(c.startDate, today) + 1;
  const dayNumber = Math.max(0, Math.min(c.targetDays, elapsedRaw));
  const lastLived = today > end ? end : today;

  let daysCompleted = 0;
  let daysMissed = 0;
  let run = 0;
  let bestStreak = 0;
  let pctSum = 0;
  let livedDays = 0;
  const days = dayNumber > 0 ? Array.from({ length: daysBetween(c.startDate, lastLived) + 1 }, (_, i) => addDaysToDateString(c.startDate, i)) : [];

  days.forEach((date) => {
    const p = boardDayProgress(c, date);
    livedDays++;
    pctSum += p.pct;
    if (p.completed) {
      daysCompleted++;
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else if (date < today) {
      daysMissed++;
      run = 0;
    }
    // Hoje ainda em andamento: não quebra a sequência
  });

  const nextMilestone = (c.milestones || [])
    .filter((m) => isValidDateString(m.date) && m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return {
    dayNumber,
    targetDays: c.targetDays,
    phase: boardPhase(Math.max(1, dayNumber), c.targetDays),
    timePct: Math.min(100, Math.round((dayNumber / Math.max(1, c.targetDays)) * 100)),
    daysCompleted,
    daysMissed,
    streak: run,
    bestStreak,
    adherence: livedDays > 0 ? Math.round(pctSum / livedDays) : 0,
    remaining: Math.max(0, c.targetDays - dayNumber),
    today: boardDayProgress(c, today),
    nextMilestone: nextMilestone ? { ...nextMilestone, inDays: daysBetween(today, nextMilestone.date) } : undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// Recompensas: o conjunto de lançamentos que o dia "merece"
// ─────────────────────────────────────────────────────────────

export const boardGrantPrefix = (challengeId: string, date: string) => `board:${challengeId}:${date}:`;

export interface DesiredBoardGrant {
  key: string;
  label: string;
  xp: number;
  ryo: number;
  pillarId: PillarId;
  kind: 'cell' | 'section' | 'day';
  dealDamage: boolean;
}

/** Lançamentos que deveriam existir para o quadro em uma data, dadas as marcações atuais. */
export function desiredBoardGrants(c: UserChallenge, date: string): DesiredBoardGrant[] {
  const prefix = boardGrantPrefix(c.id, date);
  const marks = marksOn(c, date);
  const out: DesiredBoardGrant[] = [];

  (c.sections || []).forEach((section) => {
    const pillarId = section.pillarId || 'genjutsu';
    const rowLabel = new Map(section.rows.map((r) => [r.id, r.label]));
    const colLabel = new Map((section.columns || []).map((col) => [col.id, col.label]));
    sectionCells(section, date).forEach((cell) => {
      if (!marks.has(cell.key)) return;
      const label = cell.colId
        ? `${rowLabel.get(cell.rowId)} · ${colLabel.get(cell.colId)}`
        : rowLabel.get(cell.rowId) || section.title;
      out.push({ key: `${prefix}c:${cell.key}`, label, xp: BOARD_CELL_XP, ryo: BOARD_CELL_RYO, pillarId, kind: 'cell', dealDamage: false });
    });
    if (sectionProgress(section, marks, date).complete) {
      out.push({
        key: `${prefix}s:${section.id}`,
        label: `Seção completa: ${section.title}`,
        xp: BOARD_SECTION_XP,
        ryo: BOARD_SECTION_RYO,
        pillarId,
        kind: 'section',
        dealDamage: true,
      });
    }
  });

  if (boardDayProgress(c, date).completed) {
    out.push({
      key: `${prefix}day`,
      label: `Dia cumprido: ${c.title}`,
      xp: BOARD_DAY_XP,
      ryo: BOARD_DAY_RYO,
      pillarId: 'chakra',
      kind: 'day',
      dealDamage: true,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Edição
// ─────────────────────────────────────────────────────────────

export const newBoardId = (prefix = 'b') => `${prefix}${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;

/** Limpa uma estrutura vinda do editor: tira linhas/colunas sem nome e seções vazias de título. */
export function sanitizeSections(sections: BoardSection[]): BoardSection[] {
  return sections
    .filter((s) => s.title.trim())
    .map((s) => ({
      ...s,
      title: s.title.trim(),
      rows: s.rows
        .filter((r) => r.label.trim())
        .map((r) => {
          const weekdays = Array.from(new Set((r.weekdays || []).filter((d) => d >= 0 && d <= 6))).sort();
          const row: BoardRow = { id: r.id, label: r.label.trim() };
          if (r.optional) row.optional = true;
          if (weekdays.length > 0 && weekdays.length < 7) row.weekdays = weekdays;
          return row;
        }),
      columns: s.kind === 'matrix' ? (s.columns || []).filter((col) => col.label.trim()).map((col) => ({ ...col, label: col.label.trim() })) : undefined,
    }));
}

// ─────────────────────────────────────────────────────────────
// Modelos
// ─────────────────────────────────────────────────────────────

export interface BoardTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  icon: string;
  targetDays: number;
  dailyGoalPct: number;
  sections: BoardSection[];
  milestones: Omit<BoardMilestone, 'id'>[];
}

const NETWORKS = [
  { id: 'rev', label: 'Revisar' },
  { id: 'tt', label: 'TikTok' },
  { id: 'ig', label: 'Insta' },
  { id: 'yt', label: 'YouTube' },
  { id: 'pin', label: 'Pinterest' },
];

const brandMatrix = (id: string, title: string, code: string, color: string): BoardSection => ({
  id,
  title,
  kind: 'matrix',
  pillarId: 'genjutsu',
  color,
  rows: [1, 2, 3].map((n) => ({ id: `v${n}`, label: `${code} 0${n}` })),
  columns: NETWORKS.map((n) => ({ ...n })),
});

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'afiliado-40',
    title: 'Operação Afiliado · 40 dias',
    subtitle: '9 vídeos/dia nas 4 redes, métricas, relâmpago e curadoria',
    description:
      '40 dias de operação: 3 vídeos por marca revisados e postados no TikTok, Instagram, YouTube e Pinterest, métricas acompanhadas todo dia e ofertas relâmpago atualizadas nos 3 sites. Rumo à Black Friday, ao 12.12 e ao Natal.',
    category: 'Operação Afiliado',
    icon: '🎬',
    targetDays: 40,
    dailyGoalPct: 80,
    sections: [
      {
        id: 'rel',
        title: 'Ofertas relâmpago',
        kind: 'list',
        pillarId: 'genjutsu',
        color: '#D9A441',
        rows: [
          { id: 'casa', label: 'Achei em Casa · rodar a relâmpago no Claude' },
          { id: 'mim', label: 'Achei pra Mim · rodar a relâmpago no Claude' },
          { id: 'setup', label: 'Achei pro Setup · rodar a relâmpago no Claude' },
        ],
      },
      brandMatrix('apc', 'Achei em Casa', 'APC', '#6F8F72'),
      brandMatrix('apm', 'Achei pra Mim', 'APM', '#C4877F'),
      brandMatrix('aps', 'Achei pro Setup', 'APS', '#2F5BEA'),
      {
        id: 'met',
        title: 'Métricas do dia',
        kind: 'list',
        pillarId: 'ninjutsu',
        rows: [
          { id: 'redes', label: 'Views, seguidores e salvamentos nas 4 redes' },
          { id: 'ml', label: 'Cliques e vendas no Mercado Livre' },
          { id: 'amz', label: 'Cliques e vendas na Amazon' },
          { id: 'top', label: 'Vídeo campeão do dia: anotar o gancho' },
          { id: 'resp', label: 'Responder comentários e directs' },
          { id: 'diario', label: 'Registrar no Diário de Resultados (Notion)' },
          { id: 'semana', label: 'Revisão da semana: escalar o que vendeu, cortar o resto', weekdays: [0] },
        ],
      },
      {
        id: 'cur',
        title: 'Curadoria pessoal',
        kind: 'list',
        pillarId: 'ninjutsu',
        rows: [
          { id: 'p1', label: 'Produto 1 validado, com link de afiliado', optional: true },
          { id: 'p2', label: 'Produto 2 validado, com link de afiliado', optional: true },
          { id: 'p3', label: 'Produto 3 (bônus)', optional: true },
        ],
      },
    ],
    milestones: [
      { date: '2026-11-27', label: 'Black Friday' },
      { date: '2026-11-30', label: 'Cyber Monday' },
      { date: '2026-12-12', label: '12.12' },
      { date: '2026-12-25', label: 'Natal' },
    ],
  },
  {
    id: 'blank',
    title: 'Quadro em branco',
    subtitle: 'Uma lista inicial; você monta o resto em "Editar quadro"',
    description: '',
    category: 'Operação',
    icon: '🗂️',
    targetDays: 30,
    dailyGoalPct: 80,
    sections: [
      {
        id: 'tarefas',
        title: 'Tarefas do dia',
        kind: 'list',
        pillarId: 'genjutsu',
        rows: [
          { id: 't1', label: 'Tarefa 1' },
          { id: 't2', label: 'Tarefa 2' },
        ],
      },
    ],
    milestones: [],
  },
];

/** Monta as seções e os marcos de um modelo para um desafio que começa em `startDate`. */
export function instantiateTemplate(template: BoardTemplate, startDate: string, targetDays = template.targetDays) {
  const end = addDaysToDateString(startDate, targetDays - 1);
  return {
    sections: JSON.parse(JSON.stringify(template.sections)) as BoardSection[],
    milestones: template.milestones
      .filter((m) => m.date >= startDate && m.date <= end)
      .map((m, i) => ({ ...m, id: `m${i + 1}` })),
  };
}
