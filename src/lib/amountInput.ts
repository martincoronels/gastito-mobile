import { formatInteger } from './money';

const INVALID = /[^\d.,\s$]/;

/** Separa el texto nuevo en lo que ya estaba (antes y después) y lo que se acaba de tipear o pegar. */
function splitEdit(prev: string, next: string) {
  const max = Math.min(prev.length, next.length);
  let start = 0;
  while (start < max && prev[start] === next[start]) start++;
  let end = 0;
  while (end < max - start && prev[prev.length - 1 - end] === next[next.length - 1 - end]) end++;
  return {
    before: next.slice(0, start),
    inserted: next.slice(start, next.length - end),
    after: next.slice(next.length - end),
  };
}

/** Arma el texto final del campo: "12345,5" → "12.345,5". */
export function normalizeAmount(raw: string): string {
  const i = raw.indexOf(',');
  let int = (i < 0 ? raw : raw.slice(0, i)).replace(/\D/g, '');
  let dec = (i < 0 ? '' : raw.slice(i + 1)).replace(/\D/g, '');
  let hasComma = i >= 0;
  if (dec.length > 2) {
    // "1,000" eran mil pesos, no un peso
    int += dec;
    dec = '';
    hasComma = false;
  }
  int = int.slice(0, 12).replace(/^0+(?=\d)/, '');
  let out = int ? formatInteger(Number(int)) : '';
  if (hasComma) out = `${out || '0'},${dec}`;
  return out;
}

export type AmountEdit = { ok: true; value: string } | { ok: false };

/**
 * Procesa cada cambio del campo de monto: deja solo dígitos y una coma decimal, y va poniendo
 * los puntos de miles. Los puntos que ya estaban en el campo son de miles (los puso la app);
 * un punto recién tipeado es la coma decimal del teclado en inglés.
 *
 * Diferencia con la web: allá, borrar el último dígito de "12.345" dejaba "12,34" (el punto de
 * miles pasaba a ser decimal). Acá queda "1.234".
 *
 * Si se tipea o pega algo que no puede ser parte de un monto, devuelve ok: false (el campo rebota).
 */
export function nextAmountInput(prev: string, next: string): AmountEdit {
  const { before, inserted, after } = splitEdit(prev, next);
  if (INVALID.test(inserted)) return { ok: false };
  const typed = inserted
    .replace(/[^\d.,]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '') // "5.000" pegado: punto de miles
    .replace(/\./g, ','); // cualquier otro punto tipeado es la coma decimal
  const keep = (s: string) => s.replace(/\./g, '');
  return { ok: true, value: normalizeAmount(keep(before) + typed + keep(after)) };
}
