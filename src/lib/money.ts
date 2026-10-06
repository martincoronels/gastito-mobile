/** Espacio que no corta: "$ 86.500" nunca queda partido entre dos renglones. */
const NBSP = '\u00A0';
const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Entero con puntos de miles, como es-AR: 1234567 → "1.234.567". */
export function formatInteger(n: number): string {
  const v = Math.round(n);
  return (v < 0 ? '-' : '') + groupThousands(String(Math.abs(v)));
}

/** Dos decimales con coma: 1234.5 → "1.234,50". */
export function formatDecimal(n: number): string {
  const cents = Math.round(Math.abs(n) * 100);
  const int = groupThousands(String(Math.floor(cents / 100)));
  return `${n < 0 ? '-' : ''}${int},${String(cents % 100).padStart(2, '0')}`;
}

/** "$ 18.400": todos los montos de la app se muestran redondeados al peso. */
export const money = (n: number | null | undefined): string => `$${NBSP}${formatInteger(n || 0)}`;

/** El total grande con los centavos chiquitos: { main: "$ 150.700", cents: "00" }. */
export function moneyParts(n: number): { main: string; cents: string } {
  const [int = '0', cents = '00'] = formatDecimal(Math.abs(n)).split(',');
  return { main: `${n < 0 ? '-' : ''}$${NBSP}${int}`, cents };
}

/** Interpreta un monto escrito a mano: "18.400", "18400", "12,5" o "12.5". NaN si no hay número. */
export function parseAmount(input: string): number {
  const s = String(input)
    .replace(/\s|\$/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.abs(n) : NaN;
}

/** El valor con que arranca el campo de monto al editar un gasto: "18.400" o "1.234,50". */
export function amountToInput(n: number): string {
  const v = Math.round((n || 0) * 100) / 100;
  return Number.isInteger(v) ? formatInteger(v) : formatDecimal(v);
}
