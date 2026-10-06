/**
 * Links profundos: gastito://anotar, gastito://resumen?mes=2026-09… Sirven para las notificaciones
 * y para la app Atajos de iOS (un atajo "Abrir URL" en la pantalla de inicio o en el botón de
 * Acción).
 *
 * Un link nunca cambia datos por sí solo: como mucho abre el formulario con algo ya cargado, y la
 * persona decide si lo anota. Todo lo que trae se valida como lo importado.
 */
import { cleanText } from '@/lib/text';
import { parseAmount } from '@/lib/money';
import { toMonthKey, type MonthKey } from '@/lib/dates';
import { MAX_NOTE_LENGTH, type CategoryLookup } from './catalog';

export type LinkView = 'resumen' | 'movimientos' | 'fijos';

export interface ExpensePrefill {
  amount?: number;
  categoryId?: string;
  note?: string;
}

export type AppLink =
  | { kind: 'view'; view: LinkView; month?: MonthKey }
  | { kind: 'new-expense'; prefill: ExpensePrefill }
  | { kind: 'settings' };

const ROUTES: Record<string, 'new-expense' | 'settings' | LinkView> = {
  anotar: 'new-expense',
  nuevo: 'new-expense',
  resumen: 'resumen',
  movimientos: 'movimientos',
  fijos: 'fijos',
  ajustes: 'settings',
};

const MAX_URL_LENGTH = 2048;

/** Ruta y parámetros de gastito://ruta?… o, en desarrollo con Expo Go, exp://host/--/ruta?… */
export function splitUrl(url: string): { route: string; params: Record<string, string> } | null {
  if (typeof url !== 'string' || url.length > MAX_URL_LENGTH) return null;
  const match = /^[a-z][a-z0-9+.-]*:\/\/(.*)$/i.exec(url.trim());
  if (!match) return null;
  let rest = match[1];
  const dev = rest.indexOf('/--/');
  if (dev >= 0) rest = rest.slice(dev + 4);
  const [pathPart, query = ''] = rest.split(/\?(.*)/s);
  const route = pathPart
    .split('#')[0]
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
  const params: Record<string, string> = {};
  for (const pair of query.split('#')[0].split('&')) {
    if (!pair) continue;
    const [rawKey, rawValue = ''] = pair.split(/=(.*)/s);
    try {
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' ')).toLowerCase();
      if (!(key in params)) params[key] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      // un parámetro mal codificado se ignora
    }
  }
  return { route, params };
}

const isMonth = (v: string | undefined): v is MonthKey => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Interpreta un link. null si no es de Gastito o no se reconoce. */
export function parseAppLink(url: string, categories: CategoryLookup, now: Date = new Date()): AppLink | null {
  const parts = splitUrl(url);
  if (!parts) return null;
  const target = ROUTES[parts.route];
  if (!target) return null;
  if (target === 'settings') return { kind: 'settings' };

  if (target === 'new-expense') {
    const prefill: ExpensePrefill = {};
    const rawAmount = parts.params.monto ?? '';
    // parseAmount ignora el signo; en un link, un monto negativo se descarta
    const amount = rawAmount.includes('-') ? NaN : parseAmount(rawAmount);
    if (amount > 0 && amount < 1e12) prefill.amount = Math.round(amount * 100) / 100;
    const wanted = (parts.params.categoria ?? '').trim().toLowerCase();
    const category = wanted
      ? categories.all.find((c) => c.id.toLowerCase() === wanted || c.name.toLowerCase() === wanted)
      : undefined;
    if (category) prefill.categoryId = category.id;
    const note = cleanText(parts.params.nota, MAX_NOTE_LENGTH);
    if (note) prefill.note = note;
    return { kind: 'new-expense', prefill };
  }

  const month = parts.params.mes;
  // un mes futuro no tiene nada para mostrar
  if (isMonth(month) && month >= '2000-01' && month <= toMonthKey(now)) return { kind: 'view', view: target, month };
  return { kind: 'view', view: target };
}
