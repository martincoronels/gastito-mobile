import { createCategoryLookup, REST_SLICE_ID } from '../catalog';
import { monthCsv } from '../csv';
import { buildDemoData } from '../demo';
import { buildSlices, DONUT, hitTestDonut, isCategoryHighlighted, layoutDonut } from '../donut';
import {
  applyPendingFixed,
  createCategory,
  deleteCategory,
  deleteFixed,
  emptyData,
  saveExpense,
  toggleFixed,
} from '../operations';
import { sanitizeData } from '../sanitize';
import { filterMovements, groupByDay, impactMessage, monthSummary, pendingFixed, totalsByCategory } from '../selectors';
import type { AppData, Expense, RecurringExpense } from '../types';

jest.mock('@/lib/ids', () => ({ uid: () => `id_${Math.random().toString(36).slice(2, 10)}` }));

let seq = 0;
const nextId = () => `t${++seq}`;
const NOW = new Date(2026, 9, 5, 12); // 5 de octubre de 2026
const lookup = createCategoryLookup([]);
const nameOf = (id: string) => lookup.get(id).name;

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: nextId(),
  amount: 1000,
  categoryId: 'comida',
  note: '',
  date: '2026-10-01',
  method: 'Débito',
  createdAt: 0,
  recurringId: null,
  ...over,
});
const rule = (over: Partial<RecurringExpense> = {}): RecurringExpense => ({
  id: nextId(),
  amount: 5000,
  categoryId: 'subs',
  note: 'Netflix',
  method: 'Crédito',
  day: 10,
  since: '2026-01',
  active: true,
  ...over,
});
const data = (over: Partial<AppData> = {}): AppData => ({ ...emptyData(), ...over });

describe('consultas', () => {
  it('ordena las categorías de mayor a menor', () => {
    const totals = totalsByCategory([
      expense({ categoryId: 'super', amount: 500 }),
      expense({ categoryId: 'comida', amount: 300 }),
      expense({ categoryId: 'super', amount: 100 }),
    ]);
    expect(totals).toEqual([
      { id: 'super', sum: 600, n: 2 },
      { id: 'comida', sum: 300, n: 1 },
    ]);
  });

  it('detecta los fijos vencidos sin registrar', () => {
    const due = rule({ day: 3 });
    const d = data({ recurring: [due, rule({ day: 20 }), rule({ day: 1, active: false })] });
    expect(pendingFixed(d, '2026-10', NOW).map((r) => r.id)).toEqual([due.id]);
    const registered = data({ ...d, expenses: [expense({ recurringId: due.id, date: '2026-10-03' })] });
    expect(pendingFixed(registered, '2026-10', NOW)).toHaveLength(0);
  });

  it('un fijo del 31 vence igual en febrero; los meses futuros no tienen pendientes', () => {
    const d = data({ recurring: [rule({ day: 31, since: '2026-01' })] });
    expect(pendingFixed(d, '2026-02', NOW)).toHaveLength(1);
    expect(pendingFixed(d, '2026-11', NOW)).toHaveLength(0);
  });

  it('filtra, busca y agrupa movimientos por día', () => {
    const list = [
      expense({ date: '2026-10-02', note: 'Coto', categoryId: 'super', createdAt: 1 }),
      expense({ date: '2026-10-04', note: 'Uber', categoryId: 'transporte' }),
      expense({ date: '2026-10-02', note: 'Día', categoryId: 'super', createdAt: 2 }),
    ];
    const all = filterMovements(list, 'todas', '', nameOf);
    expect(all.map((e) => e.note)).toEqual(['Uber', 'Día', 'Coto']);
    expect(filterMovements(list, 'todas', 'SUPER', nameOf)).toHaveLength(2);
    expect(filterMovements(list, 'transporte', '', nameOf)).toHaveLength(1);
    expect(groupByDay(all).map((g) => [g.date, g.items.length, g.total])).toEqual([
      ['2026-10-04', 1, 1000],
      ['2026-10-02', 2, 2000],
    ]);
  });

  it('compara con el mes pasado al anotar', () => {
    const d = data({
      expenses: [expense({ date: '2026-09-10', amount: 1000 }), expense({ date: '2026-10-01', amount: 1500 })],
    });
    expect(impactMessage(d, d.expenses[1], lookup.get('comida'))).toBe(
      'Van $\u00a01.500 en comida y delivery · +50% que el mes pasado',
    );
  });

  it('resume el mes', () => {
    const d = data({
      expenses: [expense({ date: '2026-10-01', amount: 5000 }), expense({ date: '2026-09-01', amount: 2000 })],
    });
    const s = monthSummary(d, '2026-10', NOW);
    expect([s.sum, s.previousSum, s.elapsedDays, s.perDay, s.isCurrent]).toEqual([5000, 2000, 5, 1000, true]);
  });
});

describe('operaciones', () => {
  it('anota un gasto que se repite y crea su fijo', () => {
    const r = saveExpense(
      emptyData(),
      { amount: 9800, categoryId: 'subs', note: 'Netflix', date: '2026-10-07', method: 'Crédito', repeat: true },
      null,
      1,
      nextId,
    );
    expect(r.created).toBe(true);
    expect(r.data.recurring[0]).toMatchObject({ day: 7, since: '2026-10', amount: 9800 });
    expect(r.expense.recurringId).toBe(r.data.recurring[0].id);
  });

  it('al editar y destildar "se repite" quita el fijo', () => {
    const draft = { amount: 100, categoryId: 'subs', note: 'X', date: '2026-10-07', method: 'Crédito' as const };
    const first = saveExpense(emptyData(), { ...draft, repeat: true }, null, 1, nextId);
    const second = saveExpense(first.data, { ...draft, amount: 120, repeat: false }, first.expense.id, 2, nextId);
    expect(second.created).toBe(false);
    expect(second.data.recurring).toHaveLength(0);
    expect(second.data.expenses).toHaveLength(1);
    expect(second.data.expenses[0]).toMatchObject({ amount: 120, recurringId: null });
  });

  it('registra los fijos pendientes con el día recortado y el medio por defecto', () => {
    const r = rule({ day: 31, method: '', since: '2026-01' });
    const result = applyPendingFixed(data({ recurring: [r] }), '2026-02', NOW, nextId);
    expect(result.count).toBe(1);
    expect(result.data.expenses[0]).toMatchObject({ date: '2026-02-28', method: 'Débito', recurringId: r.id });
  });

  it('pausa y borra fijos', () => {
    const r = rule();
    expect(toggleFixed(data({ recurring: [r] }), r.id).recurring[0].active).toBe(false);
    const d = data({ recurring: [r], expenses: [expense({ recurringId: r.id })] });
    const after = deleteFixed(d, r.id);
    expect(after.recurring).toHaveLength(0);
    expect(after.expenses[0].recurringId).toBeNull();
  });

  it('valida las categorías propias', () => {
    expect(createCategory(emptyData(), { name: '  ', emoji: '🐶', color: '#E0452F' })).toEqual({
      ok: false,
      reason: 'empty',
    });
    expect(createCategory(emptyData(), { name: 'salud', emoji: '🐶', color: '#E0452F' })).toEqual({
      ok: false,
      reason: 'duplicate',
    });
    const ok = createCategory(emptyData(), { name: 'Mascotas  y  más', emoji: '🐶 perro', color: '#E0452F' });
    expect(ok.ok && ok.category).toMatchObject({ name: 'Mascotas y más', emoji: '🐶', custom: true });
  });

  it('al borrar una categoría propia, sus gastos pasan a Otros', () => {
    const d = data({
      categories: [{ id: 'mia_1', name: 'Mascotas', color: '#E0452F', emoji: '🐶', custom: true }],
      expenses: [expense({ categoryId: 'mia_1' })],
    });
    const after = deleteCategory(d, 'mia_1');
    expect(after.categories).toHaveLength(0);
    expect(after.expenses[0].categoryId).toBe('otros');
  });

  it('arma un mes de ejemplo coherente', () => {
    const demo = buildDemoData([], NOW, nextId);
    expect(demo.settings.budget).toBe(600000);
    expect(demo.recurring).toHaveLength(4);
    const thisMonth = demo.expenses.filter((e) => e.date.startsWith('2026-10'));
    expect(thisMonth.every((e) => Number(e.date.slice(8)) <= 5)).toBe(true);
    expect(pendingFixed(demo, '2026-09', NOW)).toHaveLength(0);
  });
});

describe('dona', () => {
  const totals = (sums: number[]) => sums.map((sum, i) => ({ id: `c${i}`, sum, n: 1 }));

  it('agrupa las porciones chiquitas que se pisarían', () => {
    const t = totals([5000, 3000, 1000, 40, 30, 20, 10]);
    const sum = t.reduce((a, x) => a + x.sum, 0);
    const slices = buildSlices(t, sum, (id) => lookup.get(id));
    const rest = slices[slices.length - 1];
    expect(rest.id).toBe(REST_SLICE_ID);
    expect(rest.category.name).toBe('Otras 4 cat.');
    expect(slices.reduce((a, s) => a + s.sum, 0)).toBe(sum);
    expect(isCategoryHighlighted('c6', REST_SLICE_ID, slices)).toBe(true);
  });

  it('no agrupa si no hace falta', () => {
    expect(buildSlices(totals([500, 300, 200]), 1000, (id) => lookup.get(id))).toHaveLength(3);
  });

  it('reparte la vuelta completa y sabe qué porción se tocó', () => {
    const segments = layoutDonut([{ sum: 700 }, { sum: 290 }, { sum: 10 }], 1000);
    expect(segments.reduce((a, s) => a + s.span, 0)).toBeCloseTo(Math.PI * 2, 6);
    expect(segments[2].kind).toBe('dot');
    segments.forEach((s, i) => expect(hitTestDonut(segments, s.iconX, s.iconY)).toBe(i));
    expect(hitTestDonut(segments, DONUT.CX, DONUT.CY)).toBe(-1);
  });
});

describe('backups', () => {
  it('descarta lo inválido y conserva lo válido', () => {
    const raw = {
      expenses: [
        { id: 'a1', amount: 100, date: '2026-10-01', categoryId: 'super', note: 'ok', method: 'Débito' },
        { id: 'a2', amount: -5, date: '2026-10-01' },
        { id: 'a3', amount: 10, date: '2026-02-30' },
        { amount: 50, date: '2026-10-02', categoryId: 'inventada', recurringId: 'no-existe', method: 'Bitcoin' },
      ],
      recurring: [{ id: 'r1', amount: 10, day: 40 }],
      categories: [
        { id: 'comida', name: 'Pisada' },
        { id: 'mia_x', name: 'Mascotas', emoji: '🐶🐱', color: 'red' },
      ],
      settings: { budget: 'mucho' },
    };
    const result = sanitizeData(raw, nextId);
    expect(result?.skipped).toBe(4);
    expect(result?.data.expenses).toHaveLength(2);
    expect(result?.data.expenses[1]).toMatchObject({ categoryId: 'otros', recurringId: null, method: '' });
    expect(result?.data.categories[0]).toMatchObject({ emoji: '🐶', color: '#E0452F' });
    expect(result?.data.settings.budget).toBeNull();
  });

  it('rechaza lo que no es un backup de Gastito', () => {
    expect(sanitizeData(null)).toBeNull();
    expect(sanitizeData({ foo: 1 })).toBeNull();
    expect(sanitizeData([1, 2])).toBeNull();
  });

  it('exporta el CSV sin fórmulas peligrosas', () => {
    const d = data({ expenses: [expense({ note: '=SUMA(A1)', amount: 1500 })] });
    const csv = monthCsv(d, '2026-10', nameOf);
    expect(csv.startsWith('\uFEFF"fecha","categoria"')).toBe(true);
    expect(csv).toContain(`"'=SUMA(A1)"`);
  });
});
