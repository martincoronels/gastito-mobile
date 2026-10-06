import type { MonthKey } from '@/lib/dates';
import { expensesInMonth } from './selectors';
import type { AppData } from './types';

/** Un texto que arranca con = + - @ Excel lo ejecuta como fórmula: se le antepone un apóstrofo. */
const safeCell = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

/** El mes en CSV, listo para abrir en Excel o Google Sheets (con BOM para que respete los acentos). */
export function monthCsv(data: AppData, month: MonthKey, categoryName: (id: string) => string): string {
  const rows: string[][] = [['fecha', 'categoria', 'detalle', 'medio', 'monto', 'fijo']];
  [...expensesInMonth(data, month)]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .forEach((e) =>
      rows.push([
        e.date,
        safeCell(categoryName(e.categoryId)),
        safeCell((e.note || '').replace(/"/g, "'")),
        safeCell(e.method || ''),
        String(e.amount),
        e.recurringId ? 'si' : 'no',
      ]),
    );
  return '\uFEFF' + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
}
