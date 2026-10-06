import { emptyData } from '../operations';
import { DEFAULT_DAILY_AT } from '../preferences';
import { DAILY_DAYS_AHEAD, joinNames, MAX_PENDING, planReminders } from '../reminders';
import type { AppData, Expense, RecurringExpense } from '../types';

const NOW = new Date(2026, 9, 5, 12); // lunes 5 de octubre de 2026, 12:00
const ALL_OFF = { fixed: false, daily: false, dailyAt: DEFAULT_DAILY_AT, monthly: false };

const rule = (over: Partial<RecurringExpense>): RecurringExpense => ({
  id: 'r',
  amount: 9800,
  categoryId: 'subs',
  note: 'Netflix',
  method: 'Crédito',
  day: 7,
  since: '2026-01',
  active: true,
  ...over,
});
const expense = (over: Partial<Expense>): Expense => ({
  id: 'e',
  amount: 1000,
  categoryId: 'comida',
  note: '',
  date: '2026-10-05',
  method: 'Débito',
  createdAt: 0,
  recurringId: null,
  ...over,
});
const data = (over: Partial<AppData>): AppData => ({ ...emptyData(), ...over });

describe('recordatorios', () => {
  it('sin nada activado, no programa nada', () => {
    expect(planReminders(data({ recurring: [rule({})] }), ALL_OFF, NOW)).toEqual([]);
  });

  it('avisa el día que vence cada fijo, a las 10, en este mes y los dos siguientes', () => {
    const plan = planReminders(data({ recurring: [rule({})] }), { ...ALL_OFF, fixed: true }, NOW);
    expect(plan.map((p) => p.id)).toEqual(['fixed-2026-10-07', 'fixed-2026-11-07', 'fixed-2026-12-07']);
    expect(plan[0]).toMatchObject({ title: 'Hoy vence Netflix', body: '$ 9.800. Tocá para registrarlo en Gastito.' });
    expect(plan[0].date).toEqual(new Date(2026, 9, 7, 10, 0));
    expect(plan[0].ruleIds).toEqual(['r']);
  });

  it('no avisa lo que ya se registró, lo pausado, lo que ya pasó ni antes de que empiece', () => {
    const d = data({
      recurring: [
        rule({ id: 'ya', day: 7 }),
        rule({ id: 'pausa', day: 8, active: false }),
        rule({ id: 'pasado', day: 2 }),
        rule({ id: 'futuro', day: 9, since: '2026-12' }),
      ],
      expenses: [expense({ recurringId: 'ya', date: '2026-10-03' })],
    });
    const october = planReminders(d, { ...ALL_OFF, fixed: true }, NOW).filter((p) => p.month === '2026-10');
    expect(october).toEqual([]);
    const ids = planReminders(d, { ...ALL_OFF, fixed: true }, NOW).map((p) => p.id);
    expect(ids).toContain('fixed-2026-12-09');
    expect(ids).not.toContain('fixed-2026-11-09');
  });

  it('junta en un solo aviso los fijos del mismo día', () => {
    const d = data({
      recurring: [rule({ id: 'a', note: 'Netflix' }), rule({ id: 'b', note: 'Spotify', amount: 6500 })],
    });
    const [first] = planReminders(d, { ...ALL_OFF, fixed: true }, NOW);
    expect(first.title).toBe('Hoy vencen 2 gastos fijos');
    expect(first.body).toBe('Netflix y Spotify: $ 16.300 en total.');
  });

  it('con el bloqueo activado, los avisos no muestran montos', () => {
    const [first] = planReminders(data({ recurring: [rule({})] }), { ...ALL_OFF, fixed: true }, NOW, {
      hideAmounts: true,
    });
    expect(first.body).toBe('Tocá para registrarlo en Gastito.');
    expect(first.body).not.toMatch(/\$/);
  });

  it('un fijo del 31 vence el último día de los meses más cortos', () => {
    const ids = planReminders(data({ recurring: [rule({ day: 31 })] }), { ...ALL_OFF, fixed: true }, NOW).map(
      (p) => p.id,
    );
    expect(ids).toEqual(['fixed-2026-10-31', 'fixed-2026-11-30', 'fixed-2026-12-31']);
  });

  it('el recordatorio diario se saltea hoy si ya se anotó algo', () => {
    const reminders = { ...ALL_OFF, daily: true, dailyAt: 21 * 60 };
    const nothing = planReminders(data({}), reminders, NOW);
    expect(nothing).toHaveLength(DAILY_DAYS_AHEAD);
    expect(nothing[0].date).toEqual(new Date(2026, 9, 5, 21, 0));

    const logged = data({ expenses: [expense({ createdAt: new Date(2026, 9, 5, 9).getTime() })] });
    const plan = planReminders(logged, reminders, NOW);
    expect(plan).toHaveLength(DAILY_DAYS_AHEAD - 1);
    expect(plan[0].id).toBe('daily-2026-10-06');
  });

  it('el diario de hoy no se programa si la hora ya pasó', () => {
    const plan = planReminders(data({}), { ...ALL_OFF, daily: true, dailyAt: 9 * 60 }, NOW);
    expect(plan[0].id).toBe('daily-2026-10-06');
  });

  it('el 1° de cada mes avisa que cerró el anterior', () => {
    const plan = planReminders(data({}), { ...ALL_OFF, monthly: true }, NOW);
    expect(plan.map((p) => [p.id, p.title, p.month])).toEqual([
      ['monthly-2026-11', 'Cerró octubre', '2026-10'],
      ['monthly-2026-12', 'Cerró noviembre', '2026-11'],
    ]);
  });

  it('nunca pasa el límite de iOS y deja afuera primero los diarios', () => {
    const many = Array.from({ length: 28 }, (_, i) => rule({ id: `r${i}`, day: i + 1 }));
    const plan = planReminders(
      data({ recurring: many }),
      { fixed: true, daily: true, dailyAt: 1200, monthly: true },
      NOW,
    );
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING);
    expect(plan.some((p) => p.kind === 'daily')).toBe(false);
    expect(plan.every((p, i) => i === 0 || plan[i - 1].date <= p.date)).toBe(true);
  });

  it('une nombres como en castellano', () => {
    expect(joinNames(['Netflix'])).toBe('Netflix');
    expect(joinNames(['Netflix', 'Spotify', 'Internet'])).toBe('Netflix, Spotify e Internet');
    expect(joinNames(['Luz', 'Gas'])).toBe('Luz y Gas');
  });
});
