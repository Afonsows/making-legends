import { Measure, MeasureEntry } from './types';

/**
 * Medidas do "antes e depois".
 * Funções puras: a loja só guarda o mapa; resumo e mesclagem saem daqui.
 */

export type MeasureMap = Record<string, Measure>;

export interface MeasurePreset {
  label: string;
  unit: string;
  goal: Measure['goal'];
}

export const MEASURE_PRESETS: MeasurePreset[] = [
  { label: 'Peso', unit: 'kg', goal: 'down' },
  { label: 'Tempo de tela', unit: 'h/dia', goal: 'down' },
  { label: 'Sono', unit: 'h/noite', goal: 'up' },
  { label: 'Água', unit: 'L/dia', goal: 'up' },
  { label: 'Leitura', unit: 'pág/dia', goal: 'up' },
  { label: 'Hora de acordar', unit: 'h', goal: 'down' },
];

export interface MeasurePoint {
  date: string;
  value: number;
}

export interface MeasureSummary {
  points: MeasurePoint[];
  first?: MeasurePoint;
  last?: MeasurePoint;
  /** Diferença entre o último e o primeiro registro (0 com menos de dois registros). */
  delta: number;
  /** true = mudou na direção desejada; false = na direção contrária; null = sem mudança ou sem dados. */
  improved: boolean | null;
}

/** Registros válidos, do mais antigo ao mais recente. */
export function measureSeries(measure: Measure): MeasurePoint[] {
  return Object.entries(measure.entries || {})
    .filter(([, entry]) => entry && typeof entry.value === 'number' && Number.isFinite(entry.value))
    .map(([date, entry]) => ({ date, value: entry.value as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeMeasure(measure: Measure): MeasureSummary {
  const points = measureSeries(measure);
  const first = points[0];
  const last = points[points.length - 1];
  const delta = points.length >= 2 ? Math.round((last.value - first.value) * 100) / 100 : 0;
  const improved = delta === 0 ? null : measure.goal === 'up' ? delta > 0 : delta < 0;
  return { points, first, last, delta, improved };
}

/** Medidas não excluídas, na ordem em que foram criadas. */
export function activeMeasures(map?: MeasureMap): Measure[] {
  return Object.values(map || {})
    .filter((m) => m && !m.deletedAt)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

/** Número formatado em pt-BR, sem zeros desnecessários. */
export function formatMeasureValue(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const laterEntry = (a?: MeasureEntry, b?: MeasureEntry): MeasureEntry | undefined => {
  if (!a) return b;
  if (!b) return a;
  return (b.at || '') > (a.at || '') ? b : a;
};

/**
 * Mescla as medidas de dois aparelhos.
 * Cada registro vence pelo instante mais recente; a exclusão é uma lápide que viaja junto.
 * Pura e idempotente, como o resto da sincronização.
 */
export function mergeMeasures(a?: MeasureMap, b?: MeasureMap): MeasureMap | undefined {
  if (!a && !b) return undefined;
  const out: MeasureMap = {};
  const ids = Array.from(new Set([...Object.keys(a || {}), ...Object.keys(b || {})])).sort();

  ids.forEach((id) => {
    const left = a?.[id];
    const right = b?.[id];
    if (!left || !right) {
      out[id] = (left || right) as Measure;
      return;
    }

    const meta = (right.updatedAt || '') > (left.updatedAt || '') ? right : left;
    const deletedAt = [left.deletedAt, right.deletedAt].filter(Boolean).sort().pop();
    const entries: Record<string, MeasureEntry> = {};
    if (!deletedAt) {
      const dates = Array.from(new Set([...Object.keys(left.entries || {}), ...Object.keys(right.entries || {})])).sort();
      dates.forEach((date) => {
        const winner = laterEntry(left.entries?.[date], right.entries?.[date]);
        if (winner) entries[date] = winner;
      });
    }

    out[id] = {
      id,
      label: meta.label,
      unit: meta.unit,
      goal: meta.goal,
      entries,
      createdAt: [left.createdAt, right.createdAt].filter(Boolean).sort()[0] || meta.createdAt,
      updatedAt: meta.updatedAt,
      ...(deletedAt ? { deletedAt } : {}),
    };
  });

  return out;
}
