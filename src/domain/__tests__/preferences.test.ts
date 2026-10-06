import { DEFAULT_DAILY_AT, defaultPreferences, formatTime, sanitizePreferences } from '../preferences';

describe('preferencias', () => {
  it('sin nada guardado, usa las de siempre (todo apagado, apariencia del sistema)', () => {
    expect(sanitizePreferences(null)).toEqual(defaultPreferences());
    expect(sanitizePreferences('basura')).toEqual(defaultPreferences());
  });

  it('conserva lo válido y descarta lo demás', () => {
    const prefs = sanitizePreferences({
      appearance: 'dark',
      lock: true,
      reminders: { fixed: true, daily: 'sí', dailyAt: 20 * 60 + 30, monthly: true },
      usage: { firstOpenAt: 1700000000000, expensesCreated: 12, reviewRequestedAt: -5 },
    });
    expect(prefs.appearance).toBe('dark');
    expect(prefs.lock).toBe(true);
    expect(prefs.reminders).toEqual({ fixed: true, daily: false, dailyAt: 1230, monthly: true });
    expect(prefs.usage).toEqual({ firstOpenAt: 1700000000000, expensesCreated: 12, reviewRequestedAt: null });
  });

  it('una hora fuera de rango vuelve a la de siempre', () => {
    expect(sanitizePreferences({ reminders: { dailyAt: 24 * 60 } }).reminders.dailyAt).toBe(DEFAULT_DAILY_AT);
    expect(sanitizePreferences({ reminders: { dailyAt: 12.5 } }).reminders.dailyAt).toBe(DEFAULT_DAILY_AT);
    expect(sanitizePreferences({ appearance: 'sepia' }).appearance).toBe('system');
  });

  it('muestra la hora como en el reloj', () => {
    expect(formatTime(21 * 60)).toBe('21:00');
    expect(formatTime(9 * 60 + 5)).toBe('09:05');
  });
});
