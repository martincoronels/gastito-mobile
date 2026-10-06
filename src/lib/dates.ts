/**
 * Fechas como texto, igual que en la web: los meses son "YYYY-MM" y los días "YYYY-MM-DD",
 * siempre en hora local. Los nombres van fijos en español en lugar de depender de Intl:
 * Hermes (el motor de JS en iOS) no los arma exactamente igual que el navegador.
 */
export type MonthKey = string;
export type DateKey = string;

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'] as const;
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const numbers = (key: string) => key.split('-').map(Number);
const monthIndex = (month: MonthKey) => Number(month.slice(5, 7)) - 1;

export const toMonthKey = (d: Date): MonthKey => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
export const toDateKey = (d: Date): DateKey => `${toMonthKey(d)}-${pad2(d.getDate())}`;
export const currentMonth = (now: Date = new Date()): MonthKey => toMonthKey(now);
export const today = (now: Date = new Date()): DateKey => toDateKey(now);
export const monthOf = (date: DateKey): MonthKey => date.slice(0, 7);
export const dayOf = (date: DateKey): number => Number(date.slice(8, 10));

export function parseDateKey(date: DateKey): Date {
  const [y, m, d] = numbers(date);
  return new Date(y, m - 1, d);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = numbers(month);
  return toMonthKey(new Date(y, m - 1 + delta, 1));
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = numbers(month);
  return new Date(y, m, 0).getDate();
}

/** "Octubre de 2026" */
export const monthTitle = (month: MonthKey): string =>
  `${capitalize(MONTHS[monthIndex(month)])} de ${month.slice(0, 4)}`;

/** "octubre" */
export const monthName = (month: MonthKey): string => MONTHS[monthIndex(month)];

/** "Oct": las etiquetas del gráfico de los últimos 6 meses */
export const monthAbbr = (month: MonthKey): string => capitalize(MONTHS_SHORT[monthIndex(month)]);

/** "5 oct 2026": cómo se ve la fecha en el formulario */
export function shortDate(date: DateKey): string {
  const d = parseDateKey(date);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Hoy", "Ayer" o "Sábado, 3 de octubre" */
export function dayLabel(date: DateKey, now: Date = new Date()): string {
  if (date === toDateKey(now)) return 'Hoy';
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date === toDateKey(yesterday)) return 'Ayer';
  const d = parseDateKey(date);
  return capitalize(`${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`);
}
