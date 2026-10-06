import { createCategoryLookup, REST_SLICE_ID } from '../catalog';
import { monthCsv } from '../csv';
import { buildDemoData } from '../demo';
import { buildSlices, DONUT, hitTestDonut, isCategoryHighlighted, layoutDonut } from '../donut';
import {
  applyPendingFixed,
  createCategory,
  deleteCategory,
  deleteExpense,
  deleteFixed,
  duplicateExpense,
  emptyData,
  isEmptyData,
  restoreExpense,
  restoreFixed,
  saveExpense,
  toggleFixed,
} from '../operations';
import { sanitizeData } from '../sanitize';
import {
  averageOf,
  budgetAlert,
  filterMovements,
  groupByDay,
  impactMessage,
  lastMonths,
  monthSummary,
  pendingFixed,
  totalsByCategory,
  unregisteredFixed,
} from '../selectors';
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

  it('al anotar en el mes en curso, compara con lo que iba a esta altura del mes pasado', () => {
    const d = data({
      expenses: [
        expense({ date: '2026-09-03', amount: 1000 }),
        expense({ date: '2026-09-20', amount: 9000 }), // después del día 5: no cuenta
        expense({ date: '2026-10-01', amount: 1500 }),
      ],
    });
    expect(impactMessage(d, d.expenses[2], lookup.get('comida'), NOW)).toBe(
      'Van $\u00a01.500 en comida y delivery · +50% que a esta altura del mes pasado',
    );
  });

  it('al anotar en un mes pasado, compara con el mes anterior completo', () => {
    const d = data({
      expenses: [expense({ date: '2026-08-25', amount: 1000 }), expense({ date: '2026-09-02', amount: 1500 })],
    });
    expect(impactMessage(d, d.expenses[1], lookup.get('comida'), NOW)).toBe(
      'Van $\u00a01.500 en comida y delivery · +50% que el mes anterior',
    );
    const alone = data({ expenses: [expense({ date: '2026-10-02', amount: 700 })] });
    expect(impactMessage(alone, alone.expenses[0], lookup.get('comida'), NOW)).toBe(
      'Anotado. Van $\u00a0700 en comida y delivery este mes',
    );
  });

  it('resume el mes comparando a esta altura del mes pasado', () => {
    const d = data({
      expenses: [
        expense({ date: '2026-10-01', amount: 5000 }),
        expense({ date: '2026-09-01', amount: 2000 }),
        expense({ date: '2026-09-28', amount: 8000 }),
      ],
    });
    const s = monthSummary(d, '2026-10', NOW);
    expect([s.sum, s.previousSum, s.previousComparable, s.elapsedDays, s.perDay, s.isCurrent]).toEqual([
      5000,
      10000,
      2000,
      5,
      1000,
      true,
    ]);
    expect(s.change).toBe(150);
    // un mes pasado se compara contra el anterior completo
    const past = monthSummary(d, '2026-09', NOW);
    expect([past.previousComparable, past.change, past.projection]).toEqual([0, null, 10000]);
  });

  it('el cierre estimado suma los fijos del mes y proyecta solo lo variable', () => {
    const rent = rule({ id: 'alquiler', amount: 300000, day: 1, categoryId: 'hogar' });
    const gym = rule({ id: 'gym', amount: 20000, day: 15, categoryId: 'salud' });
    const d = data({
      recurring: [rent, gym],
      expenses: [
        expense({ date: '2026-10-01', amount: 300000, recurringId: 'alquiler' }),
        expense({ date: '2026-10-02', amount: 5000 }),
        expense({ date: '2026-10-04', amount: 5000 }),
      ],
    });
    const s = monthSummary(d, '2026-10', NOW);
    expect(s.upcomingFixed).toBe(20000);
    // 300.000 + 20.000 de fijos + (10.000 / 5 días) × 31 días
    expect(s.projection).toBe(300000 + 20000 + 2000 * 31);
    expect(unregisteredFixed(d, '2026-10', NOW).map((r) => r.id)).toEqual(['gym']);
    expect(unregisteredFixed(d, '2026-09', NOW)).toEqual([]);
  });

  it('avisa del presupuesto solo al cruzar el 80% o el 100%', () => {
    expect(budgetAlert(70000, 85000, 100000)).toEqual({ level: 'near', left: 15000 });
    expect(budgetAlert(85000, 90000, 100000)).toBeNull();
    expect(budgetAlert(90000, 101000, 100000)).toEqual({ level: 'over', left: -1000 });
    expect(budgetAlert(50000, 120000, 100000)).toEqual({ level: 'over', left: -20000 });
    expect(budgetAlert(101000, 105000, 100000)).toBeNull();
    expect(budgetAlert(0, 50000, null)).toBeNull();
    expect(budgetAlert(90000, 80000, 100000)).toBeNull();
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

describe('deshacer y duplicar', () => {
  it('un gasto borrado vuelve tal cual, una sola vez', () => {
    const r = rule();
    const e = expense({ recurringId: r.id });
    const d = data({ recurring: [r], expenses: [e] });
    const restored = restoreExpense(deleteExpense(d, e.id), e);
    expect(restored.expenses).toEqual([e]);
    expect(restoreExpense(restored, e).expenses).toHaveLength(1);
    // si el fijo ya no existe, vuelve suelto
    expect(restoreExpense(data({ expenses: [] }), e).expenses[0].recurringId).toBeNull();
  });

  it('un fijo borrado vuelve y se reengancha con sus gastos', () => {
    const r = rule();
    const e = expense({ recurringId: r.id });
    const other = expense();
    const d = data({ recurring: [r], expenses: [e, other] });
    const back = restoreFixed(deleteFixed(d, r.id), r, [e.id]);
    expect(back.recurring).toEqual([r]);
    expect(back.expenses.find((x) => x.id === e.id)?.recurringId).toBe(r.id);
    expect(back.expenses.find((x) => x.id === other.id)?.recurringId).toBeNull();
    expect(restoreFixed(back, r, [e.id]).recurring).toHaveLength(1);
  });

  it('anotar otra vez copia el gasto con otra fecha y sin fijo', () => {
    const e = expense({ amount: 2500, note: 'Café', recurringId: 'r1', date: '2026-09-02' });
    const { data: next, expense: copy } = duplicateExpense(data({ expenses: [e] }), e, '2026-10-05', 99, nextId);
    expect(next.expenses).toHaveLength(2);
    expect(copy).toMatchObject({ amount: 2500, note: 'Café', date: '2026-10-05', createdAt: 99, recurringId: null });
    expect(copy.id).not.toBe(e.id);
  });

  it('sabe cuándo no quedó nada', () => {
    expect(isEmptyData(emptyData())).toBe(true);
    expect(isEmptyData(data({ expenses: [expense()] }))).toBe(false);
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

describe('correcciones', () => {
  it('al destildar "se repite" en un gasto, los meses anteriores dejan de apuntar al fijo borrado', () => {
    const draft = { amount: 100, categoryId: 'subs', note: 'Gym', date: '2026-09-07', method: 'Crédito' as const };
    const first = saveExpense(emptyData(), { ...draft, repeat: true }, null, 1, nextId);
    const ruleId = first.data.recurring[0].id;
    const october = {
      ...first.data,
      expenses: [...first.data.expenses, expense({ date: '2026-10-07', recurringId: ruleId })],
    };
    const edited = saveExpense(
      october,
      { ...draft, date: '2026-10-07', repeat: false },
      october.expenses[1].id,
      2,
      nextId,
    );
    expect(edited.data.recurring).toHaveLength(0);
    expect(edited.data.expenses.every((e) => e.recurringId === null)).toBe(true);
  });

  it('la búsqueda ignora tildes y mayúsculas', () => {
    const list = [expense({ note: 'Café en Palermo' }), expense({ note: 'Panadería' })];
    expect(filterMovements(list, 'todas', 'cafe', nameOf)).toHaveLength(1);
    expect(filterMovements(list, 'todas', 'PANADERIA', nameOf)).toHaveLength(1);
    expect(filterMovements(list, 'todas', 'categoría', () => 'Categoria')).toHaveLength(2);
  });

  it('el promedio de los últimos meses no cuenta los meses vacíos', () => {
    const d = data({
      expenses: [expense({ date: '2026-10-01', amount: 3000 }), expense({ date: '2026-09-01', amount: 1000 })],
    });
    expect(averageOf(lastMonths(d, '2026-10'))).toBe(2000);
    expect(averageOf(lastMonths(emptyData(), '2026-10'))).toBe(0);
  });
});
