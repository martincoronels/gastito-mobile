/**
 * Todo lo que entra desde afuera (lo guardado en el teléfono o un backup importado) pasa por acá:
 * cada registro se arma de cero, campo por campo, y lo que no tiene el formato esperado se
 * descarta. Un archivo roto o editado a mano no puede romper la app.
 */
import { daysInMonth } from '@/lib/dates';
import { uid } from '@/lib/ids';
import { cleanText, firstGrapheme } from '@/lib/text';
import {
  BUILT_IN_CATEGORIES,
  CUSTOM_COLORS,
  CUSTOM_HINT,
  DEFAULT_EMOJI,
  FALLBACK_CATEGORY_ID,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_CATEGORIES,
  MAX_NOTE_LENGTH,
  isPaymentMethod,
} from './catalog';
import { emptyData } from './operations';
import type { AppData, PaymentMethod } from './types';

type Obj = Record<string, unknown>;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e15;
const isMonth = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) && Number(v.slice(0, 4)) >= 1000;
const isDate = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  isMonth(v.slice(0, 7)) &&
  Number(v.slice(8)) >= 1 &&
  Number(v.slice(8)) <= daysInMonth(v.slice(0, 7));

export const isColor = (v: unknown): v is string => typeof v === 'string' && COLOR_RE.test(v);
/** Un color que no sea hexadecimal nunca llega a la interfaz. */
export const safeColor = (c: unknown): string => (isColor(c) ? c : '#6E7A72');

export function sanitizeData(input: unknown, newId: () => string = uid): { data: AppData; skipped: number } | null {
  if (!isObj(input) || !Array.isArray(input.expenses)) return null;
  const out = emptyData();
  let skipped = 0;

  const known = new Set(BUILT_IN_CATEGORIES.map((c) => c.id));
  const names = new Set(BUILT_IN_CATEGORIES.map((c) => c.name.toLowerCase()));
  for (const k of Array.isArray(input.categories) ? input.categories : []) {
    if (!isObj(k)) {
      skipped++;
      continue;
    }
    const id = k.id;
    const name = cleanText(k.name, MAX_CATEGORY_NAME_LENGTH);
    if (
      !name ||
      !isId(id) ||
      known.has(id) ||
      names.has(name.toLowerCase()) ||
      out.categories.length >= MAX_CUSTOM_CATEGORIES
    ) {
      skipped++;
      continue;
    }
    known.add(id);
    names.add(name.toLowerCase());
    const color = k.color;
    out.categories.push({
      id,
      name,
      emoji: firstGrapheme(cleanText(k.emoji, 16)) || DEFAULT_EMOJI,
      color: isColor(color) ? color : CUSTOM_COLORS[0],
      hint: CUSTOM_HINT,
      custom: true,
    });
  }

  const categoryId = (v: unknown) => (typeof v === 'string' && known.has(v) ? v : FALLBACK_CATEGORY_ID);
  const method = (v: unknown): PaymentMethod | '' => (isPaymentMethod(v) ? v : '');

  const ruleIds = new Set<string>();
  for (const r of Array.isArray(input.recurring) ? input.recurring : []) {
    if (!isObj(r)) {
      skipped++;
      continue;
    }
    const { id, amount, day, since } = r;
    if (
      !isId(id) ||
      ruleIds.has(id) ||
      !isAmount(amount) ||
      typeof day !== 'number' ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      skipped++;
      continue;
    }
    ruleIds.add(id);
    out.recurring.push({
      id,
      amount,
      categoryId: categoryId(r.categoryId),
      note: cleanText(r.note, MAX_NOTE_LENGTH),
      method: method(r.method),
      day,
      since: isMonth(since) ? since : undefined,
      active: r.active !== false,
    });
  }

  const expenseIds = new Set<string>();
  for (const e of input.expenses) {
    if (!isObj(e)) {
      skipped++;
      continue;
    }
    const { amount, date, createdAt, recurringId } = e;
    if (!isAmount(amount) || !isDate(date)) {
      skipped++;
      continue;
    }
    const id = isId(e.id) && !expenseIds.has(e.id) ? e.id : newId();
    expenseIds.add(id);
    out.expenses.push({
      id,
      amount,
      categoryId: categoryId(e.categoryId),
      note: cleanText(e.note, MAX_NOTE_LENGTH),
      date,
      method: method(e.method),
      createdAt: typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : 0,
      recurringId: isId(recurringId) && ruleIds.has(recurringId) ? recurringId : null,
    });
  }

  const budget = isObj(input.settings) ? input.settings.budget : null;
  out.settings.budget = isAmount(budget) ? budget : null;
  return { data: out, skipped };
}
