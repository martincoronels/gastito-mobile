import { daysInMonth, shiftMonth, toMonthKey, type MonthKey } from '@/lib/dates';
import { uid } from '@/lib/ids';
import type { AppData, Category, Expense, PaymentMethod, RecurringExpense } from './types';

type Seed = readonly [categoryId: string, note: string, amount: number, day: number, method: PaymentMethod];

const SEED: readonly Seed[] = [
  ['comida', 'PedidosYa', 18400, 3, 'Mercado Pago'],
  ['comida', 'Empanadas del barrio', 12600, 11, 'Efectivo'],
  ['comida', 'Rappi con Vicky', 21300, 17, 'Crédito'],
  ['super', 'Compra semanal Coto', 86500, 2, 'Débito'],
  ['super', 'Verdulería', 14200, 9, 'Efectivo'],
  ['super', 'Compra semanal Día', 72800, 16, 'Débito'],
  ['transporte', 'Uber a la facu', 6800, 4, 'Mercado Pago'],
  ['transporte', 'SUBE', 15000, 1, 'Mercado Pago'],
  ['transporte', 'Uber vuelta del centro', 9200, 13, 'Mercado Pago'],
  ['subs', 'Claude Pro', 24000, 5, 'Crédito'],
  ['subs', 'Netflix', 9800, 7, 'Crédito'],
  ['subs', 'Spotify', 6500, 7, 'Crédito'],
  ['subs', 'Mercado Pago Nivel 6', 3200, 10, 'Mercado Pago'],
  ['ocio', 'Cine con Vicky', 18000, 14, 'Crédito'],
  ['ocio', 'Steam', 12000, 20, 'Crédito'],
  ['salidas', 'Cerveza con los chicos', 22000, 6, 'Efectivo'],
  ['salidas', 'Café en Palermo', 7400, 15, 'Mercado Pago'],
  ['salidas', 'Cumple de Nico', 26000, 21, 'Transferencia'],
  ['hogar', 'Internet', 32000, 10, 'Débito'],
  ['hogar', 'Luz', 18600, 12, 'Débito'],
  ['salud', 'Farmacia', 9400, 8, 'Débito'],
  ['ropa', 'Zapatillas', 95000, 19, 'Crédito'],
  ['edu', 'Libro de sistemas', 21000, 18, 'Crédito'],
  ['regalos', 'Regalo día de la madre', 34000, 20, 'Crédito'],
];
const FIXED_NOTES = ['Claude Pro', 'Netflix', 'Spotify', 'Internet'];

/**
 * Un mes de ejemplo (el actual hasta hoy, más el anterior completo) para ver la app con datos.
 * Los fijos salen del mismo seed y quedan enganchados a sus gastos, así no figuran como "sin
 * registrar". Las categorías propias del usuario no se tocan.
 */
export function buildDemoData(
  customCategories: readonly Category[],
  now: Date = new Date(),
  newId: () => string = uid,
): AppData {
  const month = toMonthKey(now);
  const previous = shiftMonth(month, -1);
  const rules: RecurringExpense[] = SEED.filter((s) => FIXED_NOTES.includes(s[1])).map(
    ([categoryId, note, amount, day, method]) => ({
      id: newId(),
      amount,
      categoryId,
      note,
      day,
      since: previous,
      active: true,
      method,
    }),
  );
  const ruleOf = new Map(rules.map((r) => [r.note, r.id] as const));
  const make = (key: MonthKey, factor: number, untilDay?: number): Expense[] =>
    SEED.filter((s) => !untilDay || s[3] <= untilDay).map(([categoryId, note, amount, day, method]) => ({
      id: newId(),
      amount: ruleOf.has(note) ? amount : Math.round((amount * factor) / 100) * 100,
      categoryId,
      note,
      date: `${key}-${String(Math.min(day, daysInMonth(key))).padStart(2, '0')}`,
      method,
      createdAt: now.getTime(),
      recurringId: ruleOf.get(note) ?? null,
    }));
  return {
    version: 1,
    categories: [...customCategories],
    expenses: [...make(previous, 0.88), ...make(month, 1, now.getDate())],
    recurring: rules,
    settings: { budget: 600000 },
  };
}
