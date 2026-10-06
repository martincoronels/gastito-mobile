/**
 * Qué recordatorios programar, como función pura: recibe los datos, las preferencias y la fecha, y
 * devuelve la lista de avisos. El servicio de notificaciones solo los programa en iOS.
 *
 * Son notificaciones locales: las arma y las muestra el propio iPhone, sin ningún servidor.
 */
import { daysInMonth, monthName, monthOf, shiftMonth, toDateKey, toMonthKey, type MonthKey } from '@/lib/dates';
import { money } from '@/lib/money';
import { createCategoryLookup } from './catalog';
import type { ReminderPreferences } from './preferences';
import type { AppData, RecurringExpense } from './types';

export type ReminderKind = 'fixed' | 'daily' | 'monthly';

export interface PlannedReminder {
  /** Estable: el mismo aviso tiene siempre el mismo id (fixed-2026-10-07, daily-2026-10-21…) */
  id: string;
  kind: ReminderKind;
  date: Date;
  title: string;
  body: string;
  /** Mes al que se refiere (para abrir la app en ese mes) */
  month: MonthKey;
  /** Los fijos que vencen ese día (para "Registrar" desde la notificación) */
  ruleIds?: string[];
}

/** iOS guarda hasta 64 notificaciones pendientes por app; se deja margen. */
export const MAX_PENDING = 60;
/** Hora de los avisos de fijos y del resumen del mes */
export const MORNING_HOUR = 10;
/** Cuántos días por delante se programa el recordatorio diario (se renueva cada vez que se abre la app) */
export const DAILY_DAYS_AHEAD = 14;

const DAILY_LINES = [
  '¿Gastaste algo hoy? Anotalo antes de que se te olvide.',
  'Un minuto ahora y a fin de mes no hay sorpresas.',
  'Tu resumen del mes se arma con lo que anotás hoy.',
  'Café, súper, SUBE: ¿quedó algo sin anotar?',
] as const;

const at = (y: number, m: number, d: number, minutes: number) =>
  new Date(y, m, d, Math.floor(minutes / 60), minutes % 60, 0, 0);

const monthParts = (month: MonthKey) => [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1] as const;

/** "Netflix", "Netflix y Spotify", "Netflix, Spotify e Internet" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  const last = names[names.length - 1];
  const glue = /^h?i/i.test(last) ? ' e ' : ' y ';
  return `${names.slice(0, -1).join(', ')}${glue}${last}`;
}

const isRegistered = (data: AppData, rule: RecurringExpense, month: MonthKey) =>
  data.expenses.some((e) => e.recurringId === rule.id && monthOf(e.date) === month);

function fixedReminders(data: AppData, now: Date, hideAmounts: boolean): PlannedReminder[] {
  const categories = createCategoryLookup(data.categories);
  const name = (r: RecurringExpense) => r.note || categories.get(r.categoryId).name;
  const thisMonth = toMonthKey(now);
  const byDay = new Map<string, { date: Date; month: MonthKey; rules: RecurringExpense[] }>();

  for (const month of [thisMonth, shiftMonth(thisMonth, 1), shiftMonth(thisMonth, 2)]) {
    const [y, m] = monthParts(month);
    for (const rule of data.recurring) {
      if (rule.active === false || month < (rule.since || thisMonth) || isRegistered(data, rule, month)) continue;
      const day = Math.min(rule.day, daysInMonth(month));
      const date = at(y, m, day, MORNING_HOUR * 60);
      if (date <= now) continue;
      const key = toDateKey(date);
      const entry = byDay.get(key) ?? { date, month, rules: [] };
      entry.rules.push(rule);
      byDay.set(key, entry);
    }
  }

  return [...byDay.entries()].map(([key, { date, month, rules }]) => {
    const total = rules.reduce((sum, r) => sum + r.amount, 0);
    const names = joinNames(rules.map(name));
    const one = rules.length === 1;
    return {
      id: `fixed-${key}`,
      kind: 'fixed',
      date,
      month,
      ruleIds: rules.map((r) => r.id),
      title: one ? `Hoy vence ${names}` : `Hoy vencen ${rules.length} gastos fijos`,
      body: hideAmounts
        ? `${one ? '' : `${names}. `}Tocá para registrar${one ? 'lo' : 'los'} en Gastito.`
        : one
          ? `${money(total)}. Tocá para registrarlo en Gastito.`
          : `${names}: ${money(total)} en total.`,
    };
  });
}

function dailyReminders(data: AppData, now: Date, dailyAt: number): PlannedReminder[] {
  const today = toDateKey(now);
  // si hoy ya se anotó algo, hoy no se recuerda
  const loggedToday = data.expenses.some((e) => e.createdAt > 0 && toDateKey(new Date(e.createdAt)) === today);
  const out: PlannedReminder[] = [];
  for (let i = 0; i < DAILY_DAYS_AHEAD; i++) {
    const date = at(now.getFullYear(), now.getMonth(), now.getDate() + i, dailyAt);
    if (date <= now || (i === 0 && loggedToday)) continue;
    const key = toDateKey(date);
    out.push({
      id: `daily-${key}`,
      kind: 'daily',
      date,
      month: toMonthKey(date),
      title: 'Gastito',
      body: DAILY_LINES[date.getDate() % DAILY_LINES.length],
    });
  }
  return out;
}

function monthlyReminders(now: Date): PlannedReminder[] {
  const thisMonth = toMonthKey(now);
  return [1, 2].map((ahead) => {
    const month = shiftMonth(thisMonth, ahead);
    const closed = shiftMonth(month, -1);
    const [y, m] = monthParts(month);
    return {
      id: `monthly-${month}`,
      kind: 'monthly',
      date: at(y, m, 1, MORNING_HOUR * 60),
      month: closed,
      title: `Cerró ${monthName(closed)}`,
      body: 'Mirá cuánto gastaste, en qué se te fue y cómo te fue contra el mes anterior.',
    };
  });
}

/**
 * Los avisos a programar, ordenados por fecha. Si hay más de los que iOS permite, quedan primero
 * los fijos (avisan de plata que se debe), después el resumen del mes y por último los diarios.
 */
export function planReminders(
  data: AppData,
  reminders: ReminderPreferences,
  now: Date = new Date(),
  options: { hideAmounts?: boolean } = {},
): PlannedReminder[] {
  const priority = [
    ...(reminders.fixed ? fixedReminders(data, now, options.hideAmounts ?? false) : []),
    ...(reminders.monthly ? monthlyReminders(now) : []),
    ...(reminders.daily ? dailyReminders(data, now, reminders.dailyAt) : []),
  ];
  return priority.slice(0, MAX_PENDING).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export const anyReminderOn = (r: ReminderPreferences) => r.fixed || r.daily || r.monthly;
