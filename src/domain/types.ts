import type { DateKey, MonthKey } from '@/lib/dates';

export type PaymentMethod = 'Débito' | 'Crédito' | 'Efectivo' | 'Mercado Pago' | 'Transferencia';

/** Íconos dibujados de las categorías de fábrica. */
export type CategoryIcon =
  'bowl' | 'bag' | 'car' | 'repeat' | 'ticket' | 'glass' | 'home' | 'cross' | 'shirt' | 'cap' | 'gift' | 'dots';

export interface Category {
  id: string;
  name: string;
  color: string;
  hint?: string;
  /** Categorías de fábrica: ícono dibujado */
  icon?: CategoryIcon;
  /** Categorías propias: el emoji que eligió el usuario */
  emoji?: string;
  custom?: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  note: string;
  date: DateKey;
  method: PaymentMethod | '';
  createdAt: number;
  /** Si salió de un gasto fijo, el id de ese fijo */
  recurringId: string | null;
}

export interface RecurringExpense {
  id: string;
  amount: number;
  categoryId: string;
  note: string;
  method: PaymentMethod | '';
  /** Día del mes en que vence (si el mes es más corto, vence el último día) */
  day: number;
  /** Primer mes en que corre */
  since?: MonthKey;
  active: boolean;
}

/** Todo lo que guarda la app. Es el mismo formato que la web: los backups sirven en las dos. */
export interface AppData {
  version: 1;
  expenses: Expense[];
  recurring: RecurringExpense[];
  categories: Category[];
  settings: { budget: number | null };
}
