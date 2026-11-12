/**
 * Utilitários de data no calendário LOCAL (sem distorção de fuso/UTC).
 * Todas as datas do sistema usam o formato YYYY-MM-DD.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getTodayString(): string {
  return toDateString(new Date());
}

/** Data local (YYYY-MM-DD) de um instante ISO; `undefined` se o valor for inválido. */
export function localDateFromIso(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? toDateString(new Date(ms)) : undefined;
}

export function isValidDateString(dateStr: unknown): dateStr is string {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 2020 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const obj = new Date(y, m - 1, d);
  return obj.getFullYear() === y && obj.getMonth() === m - 1 && obj.getDate() === d;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  if (!isValidDateString(dateStr)) return getTodayString();
  const [y, m, d] = dateStr.split('-').map(Number);
  return toDateString(new Date(y, m - 1, d + days));
}

/** Diferença ASSINADA em dias: positivo quando `to` é depois de `from`. */
export function daysBetween(from: string, to: string): number {
  if (!isValidDateString(from) || !isValidDateString(to)) return 0;
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

/** Diferença absoluta em dias (compatibilidade com o código legado). */
export function getDaysDifference(dateA: string, dateB: string): number {
  return Math.abs(daysBetween(dateA, dateB));
}

/** Lista de datas de `from` até `to` (inclusive). Vazia se `to` < `from`. */
export function dateRange(from: string, to: string): string[] {
  const total = daysBetween(from, to);
  if (total < 0) return [];
  const out: string[] = [];
  for (let i = 0; i <= total && i < 3700; i++) out.push(addDaysToDateString(from, i));
  return out;
}

/** Chave da semana (segunda-feira daquela semana), usada para os Escudos de Chakra. */
export function getWeekKey(dateStr: string): string {
  const d = parseDate(dateStr);
  const dow = d.getDay(); // 0 = domingo
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  return toDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetToMonday));
}

export function formatDateBR(dateStr?: string): string {
  if (!dateStr || !isValidDateString(dateStr)) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
