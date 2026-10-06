import { daysInMonth, monthOf, shiftMonth, toMonthKey, type MonthKey } from '@/lib/dates';
import { money } from '@/lib/money';
import { ALL_FILTER } from './catalog';
import type { AppData, Category, Expense, RecurringExpense } from './types';

export interface CategoryTotal {
  id: string;
  sum: number;
  n: number;
}

export const expensesInMonth = (data: AppData, month: MonthKey): Expense[] =>
  data.expenses.filter((e) => monthOf(e.date) === month);

export const sumOf = (list: readonly { amount: number }[]): number => list.reduce((acc, item) => acc + item.amount, 0);

/** Totales por categoría, de mayor a menor (los empates quedan en el orden en que aparecieron). */
export function totalsByCategory(list: readonly Expense[]): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();
  for (const e of list) {
    const t = totals.get(e.categoryId) ?? { id: e.categoryId, sum: 0, n: 0 };
    t.sum += e.amount;
    t.n += 1;
    totals.set(e.categoryId, t);
  }
  return [...totals.values()].sort((a, b) => b.sum - a.sum);
}

/**
 * Fijos que ya vencieron en el mes y todavía no se registraron. El día se recorta al largo del
 * mes: un fijo del 31 vence igual en febrero.
 */
export function pendingFixed(data: AppData, month: MonthKey, now: Date = new Date()): RecurringExpense[] {
  const thisMonth = toMonthKey(now);
  if (month > thisMonth) return [];
  const day = month === thisMonth ? now.getDate() : 99;
  const dim = daysInMonth(month);
  return data.recurring.filter(
    (r) =>
      r.active !== false &&
      Math.min(r.day, dim) <= day &&
      month >= (r.since || thisMonth) &&
      !data.expenses.some((e) => e.recurringId === r.id && monthOf(e.date) === month),
  );
}

/** Lo que suman en el mes los gastos que salieron de un fijo. */
export const fixedTotalIn = (data: AppData, month: MonthKey): number =>
  sumOf(expensesInMonth(data, month).filter((e) => e.recurringId));

export interface MonthSummary {
  expenses: Expense[];
  sum: number;
  categories: CategoryTotal[];
  previousSum: number;
  isCurrent: boolean;
  daysInMonth: number;
  /** Días que van del mes (todos si es un mes pasado) */
  elapsedDays: number;
  perDay: number;
  pending: RecurringExpense[];
}

export function monthSummary(data: AppData, month: MonthKey, now: Date = new Date()): MonthSummary {
  const expenses = expensesInMonth(data, month);
  const sum = sumOf(expenses);
  const isCurrent = month === toMonthKey(now);
  const dim = daysInMonth(month);
  const elapsedDays = isCurrent ? now.getDate() : dim;
  return {
    expenses,
    sum,
    categories: totalsByCategory(expenses),
    previousSum: sumOf(expensesInMonth(data, shiftMonth(month, -1))),
    isCurrent,
    daysInMonth: dim,
    elapsedDays,
    perDay: sum / Math.max(elapsedDays, 1),
    pending: pendingFixed(data, month, now),
  };
}

/** Total de cada uno de los últimos meses, terminando en `month`. */
export function lastMonths(data: AppData, month: MonthKey, count = 6): { month: MonthKey; sum: number }[] {
  const out: { month: MonthKey; sum: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = shiftMonth(month, -i);
    out.push({ month: m, sum: sumOf(expensesInMonth(data, m)) });
  }
  return out;
}

/** Filtra por categoría y búsqueda, y ordena del más nuevo al más viejo. */
export function filterMovements(
  list: readonly Expense[],
  filter: string,
  query: string,
  categoryName: (id: string) => string,
): Expense[] {
  let out = filter === ALL_FILTER ? [...list] : list.filter((e) => e.categoryId === filter);
  const q = query.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (e) => (e.note || '').toLowerCase().includes(q) || categoryName(e.categoryId).toLowerCase().includes(q),
    );
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));
}

export interface DayGroup {
  date: string;
  items: Expense[];
  total: number;
}

/** Agrupa una lista ya ordenada por día. */
export function groupByDay(list: readonly Expense[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of list) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) {
      last.items.push(e);
      last.total += e.amount;
    } else {
      groups.push({ date: e.date, items: [e], total: e.amount });
    }
  }
  return groups;
}

/** El mensaje que aparece al anotar un gasto: cuánto va en esa categoría y contra el mes pasado. */
export function impactMessage(data: AppData, expense: Expense, category: Category): string {
  const month = monthOf(expense.date);
  const inCategory = (m: MonthKey) =>
    sumOf(expensesInMonth(data, m).filter((e) => e.categoryId === expense.categoryId));
  const sum = inCategory(month);
  const prev = inCategory(shiftMonth(month, -1));
  const name = category.name.toLowerCase();
  if (prev > 0) {
    const d = Math.round(((sum - prev) / prev) * 100);
    return `Van ${money(sum)} en ${name} · ${d >= 0 ? '+' : ''}${d}% que el mes pasado`;
  }
  return `Anotado. Van ${money(sum)} en ${name} este mes`;
}
