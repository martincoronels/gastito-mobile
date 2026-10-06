import { dayOf, daysInMonth, monthOf, shiftMonth, toMonthKey, type MonthKey } from '@/lib/dates';
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

/** Lo gastado en el mes hasta el día `day` inclusive (si el mes es más corto, el mes entero). */
export const sumUntilDay = (data: AppData, month: MonthKey, day: number): number =>
  sumOf(expensesInMonth(data, month).filter((e) => dayOf(e.date) <= day));

/**
 * Fijos activos que corresponden al mes y todavía no se registraron (vencidos o por vencer):
 * es plata que ya está comprometida aunque no figure en lo gastado.
 */
export function unregisteredFixed(data: AppData, month: MonthKey, now: Date = new Date()): RecurringExpense[] {
  if (month < toMonthKey(now)) return [];
  return data.recurring.filter(
    (r) =>
      r.active !== false &&
      month >= (r.since || toMonthKey(now)) &&
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
  /**
   * Con qué se compara el mes: si es el mes en curso, lo gastado el mes anterior hasta el mismo
   * día (comparar 6 días contra un mes entero siempre da "bajaste"); si es un mes pasado, el mes
   * anterior completo.
   */
  previousComparable: number;
  /** Diferencia porcentual contra `previousComparable`; null si no hay con qué comparar. */
  change: number | null;
  isCurrent: boolean;
  daysInMonth: number;
  /** Días que van del mes (todos si es un mes pasado) */
  elapsedDays: number;
  perDay: number;
  pending: RecurringExpense[];
  /** Fijos del mes sin registrar todavía (vencidos o por vencer); solo para el mes en curso */
  upcomingFixed: number;
  /**
   * Cierre estimado del mes en curso: los fijos del mes (registrados o no) más el gasto variable
   * proyectado al ritmo de lo que va del mes. Un alquiler pagado el día 1 ya no infla la proyección.
   */
  projection: number;
}

export function monthSummary(data: AppData, month: MonthKey, now: Date = new Date()): MonthSummary {
  const expenses = expensesInMonth(data, month);
  const sum = sumOf(expenses);
  const isCurrent = month === toMonthKey(now);
  const dim = daysInMonth(month);
  const elapsedDays = isCurrent ? now.getDate() : dim;
  const previous = shiftMonth(month, -1);
  const previousSum = sumOf(expensesInMonth(data, previous));
  const previousComparable = isCurrent ? sumUntilDay(data, previous, elapsedDays) : previousSum;
  const upcomingFixed = isCurrent ? sumOf(unregisteredFixed(data, month, now)) : 0;
  const fixedRegistered = sumOf(expenses.filter((e) => e.recurringId));
  const variable = sum - fixedRegistered;
  return {
    expenses,
    sum,
    categories: totalsByCategory(expenses),
    previousSum,
    previousComparable,
    change: previousComparable > 0 ? ((sum - previousComparable) / previousComparable) * 100 : null,
    isCurrent,
    daysInMonth: dim,
    elapsedDays,
    perDay: sum / Math.max(elapsedDays, 1),
    pending: pendingFixed(data, month, now),
    upcomingFixed,
    projection: isCurrent ? fixedRegistered + upcomingFixed + (variable / Math.max(elapsedDays, 1)) * dim : sum,
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

/** Para buscar sin importar mayúsculas ni tildes: "Café" → "cafe". */
export function fold(text: string): string {
  const lower = text.toLowerCase();
  return typeof lower.normalize === 'function' ? lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : lower;
}

/** Promedio de los meses que tienen gastos (los meses vacíos, antes de empezar a usar la app, no cuentan). */
export function averageOf(months: readonly { sum: number }[]): number {
  const withData = months.filter((m) => m.sum > 0);
  return withData.length ? withData.reduce((acc, m) => acc + m.sum, 0) / withData.length : 0;
}

/** Filtra por categoría y búsqueda, y ordena del más nuevo al más viejo. */
export function filterMovements(
  list: readonly Expense[],
  filter: string,
  query: string,
  categoryName: (id: string) => string,
): Expense[] {
  let out = filter === ALL_FILTER ? [...list] : list.filter((e) => e.categoryId === filter);
  const q = fold(query.trim());
  if (q) {
    out = out.filter((e) => fold(e.note || '').includes(q) || fold(categoryName(e.categoryId)).includes(q));
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

/**
 * El mensaje que aparece al anotar un gasto: cuánto va en esa categoría y contra el mes pasado.
 * En el mes en curso se compara con lo que iba a esta altura del mes pasado.
 */
export function impactMessage(data: AppData, expense: Expense, category: Category, now: Date = new Date()): string {
  const month = monthOf(expense.date);
  const isCurrent = month === toMonthKey(now);
  const inCategory = (list: Expense[]) => sumOf(list.filter((e) => e.categoryId === expense.categoryId));
  const sum = inCategory(expensesInMonth(data, month));
  const previousList = expensesInMonth(data, shiftMonth(month, -1));
  const prev = inCategory(isCurrent ? previousList.filter((e) => dayOf(e.date) <= now.getDate()) : previousList);
  const name = category.name.toLowerCase();
  if (prev > 0) {
    const d = Math.round(((sum - prev) / prev) * 100);
    const against = isCurrent ? 'que a esta altura del mes pasado' : 'que el mes anterior';
    return `Van ${money(sum)} en ${name} · ${d >= 0 ? '+' : ''}${d}% ${against}`;
  }
  return `Anotado. Van ${money(sum)} en ${name} ${isCurrent ? 'este mes' : 'ese mes'}`;
}

export type BudgetAlert = { level: 'near' | 'over'; left: number } | null;

/** Umbral a partir del cual se avisa que el presupuesto se está por terminar. */
export const BUDGET_NEAR = 0.8;

/**
 * Si un cambio hizo cruzar el 80% o el 100% del presupuesto del mes. Solo avisa al cruzar (no
 * cada vez que se anota algo arriba del umbral).
 */
export function budgetAlert(before: number, after: number, budget: number | null): BudgetAlert {
  if (!budget || after <= before) return null;
  if (before <= budget && after > budget) return { level: 'over', left: budget - after };
  if (before < budget * BUDGET_NEAR && after >= budget * BUDGET_NEAR) return { level: 'near', left: budget - after };
  return null;
}
