/**
 * Todas las modificaciones de datos, como funciones puras: reciben los datos actuales y devuelven
 * unos nuevos, sin tocar los originales. No saben nada de React ni de dónde se guardan, así que
 * se pueden testear y reutilizar tal cual si mañana hay un backend.
 */
import { dayOf, daysInMonth, monthOf, type DateKey, type MonthKey } from '@/lib/dates';
import { uid } from '@/lib/ids';
import { firstGrapheme } from '@/lib/text';
import {
  BUILT_IN_CATEGORIES,
  CUSTOM_HINT,
  DEFAULT_EMOJI,
  DEFAULT_PAYMENT_METHOD,
  FALLBACK_CATEGORY_ID,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_CATEGORIES,
} from './catalog';
import { pendingFixed } from './selectors';
import type { AppData, Category, Expense, PaymentMethod, RecurringExpense } from './types';

type IdFactory = () => string;

export const emptyData = (): AppData => ({
  version: 1,
  expenses: [],
  recurring: [],
  categories: [],
  settings: { budget: null },
});

export interface ExpenseDraft {
  amount: number;
  categoryId: string;
  note: string;
  date: DateKey;
  method: PaymentMethod;
  /** "Se repite todos los meses" */
  repeat: boolean;
}

export interface SaveExpenseResult {
  data: AppData;
  expense: Expense;
  created: boolean;
}

/** Crea o actualiza un gasto, y crea, actualiza o quita su gasto fijo según "se repite". */
export function saveExpense(
  data: AppData,
  draft: ExpenseDraft,
  editingId: string | null,
  now: number = Date.now(),
  newId: IdFactory = uid,
): SaveExpenseResult {
  const { amount, categoryId, note, date, method, repeat } = draft;
  const newRule = (): RecurringExpense => ({
    id: newId(),
    amount,
    categoryId,
    note,
    method,
    day: dayOf(date),
    since: monthOf(date),
    active: true,
  });
  const current = editingId ? data.expenses.find((e) => e.id === editingId) : undefined;

  if (current) {
    let recurring = data.recurring;
    let recurringId = current.recurringId;
    if (repeat && !recurringId) {
      const rule = newRule();
      recurring = [...recurring, rule];
      recurringId = rule.id;
    } else if (!repeat && recurringId) {
      const ruleId = recurringId;
      recurring = recurring.filter((r) => r.id !== ruleId);
      recurringId = null;
    } else if (repeat && recurringId) {
      const ruleId = recurringId;
      recurring = recurring.map((r) =>
        r.id === ruleId ? { ...r, amount, categoryId, note, method, day: dayOf(date) } : r,
      );
    }
    const expense: Expense = { ...current, amount, categoryId, note, date, method, recurringId };
    return {
      data: { ...data, recurring, expenses: data.expenses.map((e) => (e.id === current.id ? expense : e)) },
      expense,
      created: false,
    };
  }

  let recurring = data.recurring;
  let recurringId: string | null = null;
  if (repeat) {
    const rule = newRule();
    recurring = [...recurring, rule];
    recurringId = rule.id;
  }
  const expense: Expense = { id: newId(), amount, categoryId, note, date, method, createdAt: now, recurringId };
  return { data: { ...data, recurring, expenses: [...data.expenses, expense] }, expense, created: true };
}

export const deleteExpense = (data: AppData, id: string): AppData => ({
  ...data,
  expenses: data.expenses.filter((e) => e.id !== id),
});

/** Registra en el mes todos los fijos vencidos que faltaban. */
export function applyPendingFixed(
  data: AppData,
  month: MonthKey,
  now: Date = new Date(),
  newId: IdFactory = uid,
): { data: AppData; count: number } {
  const dim = daysInMonth(month);
  const created = pendingFixed(data, month, now).map((r): Expense => ({
    id: newId(),
    amount: r.amount,
    categoryId: r.categoryId,
    note: r.note,
    date: `${month}-${String(Math.min(r.day, dim)).padStart(2, '0')}`,
    method: r.method || DEFAULT_PAYMENT_METHOD,
    createdAt: now.getTime(),
    recurringId: r.id,
  }));
  return { data: { ...data, expenses: [...data.expenses, ...created] }, count: created.length };
}

/** Pausa o reactiva un gasto fijo. */
export const toggleFixed = (data: AppData, id: string): AppData => ({
  ...data,
  recurring: data.recurring.map((r) => (r.id === id ? { ...r, active: r.active === false } : r)),
});

/** Borra un fijo. Los gastos que ya generó quedan, pero dejan de estar enganchados. */
export const deleteFixed = (data: AppData, id: string): AppData => ({
  ...data,
  recurring: data.recurring.filter((r) => r.id !== id),
  expenses: data.expenses.map((e) => (e.recurringId === id ? { ...e, recurringId: null } : e)),
});

export const setBudget = (data: AppData, budget: number | null): AppData => ({
  ...data,
  settings: { ...data.settings, budget },
});

export type CreateCategoryError = 'empty' | 'duplicate' | 'limit';
export type CreateCategoryResult =
  { ok: true; data: AppData; category: Category } | { ok: false; reason: CreateCategoryError };

export function createCategory(
  data: AppData,
  input: { name: string; emoji: string; color: string },
  now: number = Date.now(),
): CreateCategoryResult {
  const name = Array.from(input.name.trim().replace(/\s+/g, ' ')).slice(0, MAX_CATEGORY_NAME_LENGTH).join('');
  if (!name) return { ok: false, reason: 'empty' };
  const taken = [...BUILT_IN_CATEGORIES, ...data.categories].some((c) => c.name.toLowerCase() === name.toLowerCase());
  if (taken) return { ok: false, reason: 'duplicate' };
  if (data.categories.length >= MAX_CUSTOM_CATEGORIES) return { ok: false, reason: 'limit' };
  const category: Category = {
    id: `mia_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    emoji: firstGrapheme(input.emoji) || DEFAULT_EMOJI,
    color: input.color,
    hint: CUSTOM_HINT,
    custom: true,
  };
  return { ok: true, category, data: { ...data, categories: [...data.categories, category] } };
}

/** Borra una categoría propia: sus gastos y fijos pasan a "Otros". */
export function deleteCategory(data: AppData, id: string): AppData {
  const move = <T extends { categoryId: string }>(item: T): T =>
    item.categoryId === id ? { ...item, categoryId: FALLBACK_CATEGORY_ID } : item;
  return {
    ...data,
    categories: data.categories.filter((c) => c.id !== id),
    expenses: data.expenses.map(move),
    recurring: data.recurring.map(move),
  };
}
