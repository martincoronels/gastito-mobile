/**
 * Preferencias de este dispositivo: apariencia, recordatorios, bloqueo. Se guardan aparte de los
 * datos (no viajan en los backups, porque son de este teléfono) y pasan por el mismo tipo de
 * validación campo por campo que lo importado.
 */
export type AppearancePreference = 'system' | 'light' | 'dark';

export interface ReminderPreferences {
  /** Avisar el día que vence cada gasto fijo */
  fixed: boolean;
  /** Recordatorio diario para anotar, si ese día no se anotó nada */
  daily: boolean;
  /** Hora del recordatorio diario, en minutos desde la medianoche */
  dailyAt: number;
  /** Aviso el 1° de cada mes para ver cómo cerró el anterior */
  monthly: boolean;
}

export interface Preferences {
  version: 1;
  appearance: AppearancePreference;
  /** Pedir Face ID (o el código del iPhone) al abrir la app */
  lock: boolean;
  reminders: ReminderPreferences;
  /** Para pedir una calificación en la App Store en un buen momento y no más de la cuenta */
  usage: { firstOpenAt: number | null; expensesCreated: number; reviewRequestedAt: number | null };
}

export const DEFAULT_DAILY_AT = 21 * 60;

export const defaultPreferences = (): Preferences => ({
  version: 1,
  appearance: 'system',
  lock: false,
  reminders: { fixed: false, daily: false, dailyAt: DEFAULT_DAILY_AT, monthly: false },
  usage: { firstOpenAt: null, expensesCreated: 0, reviewRequestedAt: null },
});

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const time = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 8.64e15 ? v : null;
const count = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e9 ? v : 0);

export function sanitizePreferences(input: unknown): Preferences {
  const out = defaultPreferences();
  if (!isObj(input)) return out;
  if (input.appearance === 'light' || input.appearance === 'dark') out.appearance = input.appearance;
  out.lock = bool(input.lock, false);
  const r = isObj(input.reminders) ? input.reminders : {};
  out.reminders = {
    fixed: bool(r.fixed, false),
    daily: bool(r.daily, false),
    dailyAt:
      typeof r.dailyAt === 'number' && Number.isInteger(r.dailyAt) && r.dailyAt >= 0 && r.dailyAt < 24 * 60
        ? r.dailyAt
        : DEFAULT_DAILY_AT,
    monthly: bool(r.monthly, false),
  };
  const u = isObj(input.usage) ? input.usage : {};
  out.usage = {
    firstOpenAt: time(u.firstOpenAt),
    expensesCreated: count(u.expensesCreated),
    reviewRequestedAt: time(u.reviewRequestedAt),
  };
  return out;
}

/** "21:00" */
export const formatTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
