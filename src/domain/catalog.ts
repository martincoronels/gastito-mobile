import type { Category, PaymentMethod } from './types';

export const BUILT_IN_CATEGORIES: readonly Category[] = [
  { id: 'comida', name: 'Comida y delivery', hint: 'Pedidos por app, rotisería', color: '#E0452F', icon: 'bowl' },
  { id: 'super', name: 'Supermercado', hint: 'Compra semanal, kiosco', color: '#1F7A4C', icon: 'bag' },
  { id: 'transporte', name: 'Transporte', hint: 'Uber, SUBE, nafta', color: '#2D5FD1', icon: 'car' },
  { id: 'subs', name: 'Suscripciones', hint: 'Netflix, Claude, Spotify', color: '#5B45C7', icon: 'repeat' },
  { id: 'ocio', name: 'Entretenimiento', hint: 'Cine, juegos, recitales', color: '#8E3EBE', icon: 'ticket' },
  { id: 'salidas', name: 'Salidas', hint: 'Bares, restaurantes, café', color: '#D2851B', icon: 'glass' },
  { id: 'hogar', name: 'Hogar y servicios', hint: 'Alquiler, luz, internet', color: '#7A5C33', icon: 'home' },
  { id: 'salud', name: 'Salud', hint: 'Farmacia, gimnasio, obra social', color: '#0E8579', icon: 'cross' },
  { id: 'ropa', name: 'Indumentaria', hint: 'Ropa, calzado', color: '#C33574', icon: 'shirt' },
  { id: 'edu', name: 'Educación', hint: 'Cursos, libros, facultad', color: '#1481A8', icon: 'cap' },
  { id: 'regalos', name: 'Regalos', hint: 'Cumpleaños, fechas', color: '#DB5F1E', icon: 'gift' },
  { id: 'otros', name: 'Otros', hint: 'Todo lo que no entra arriba', color: '#6E7A72', icon: 'dots' },
];

export const DEFAULT_CATEGORY_ID = 'comida';
export const FALLBACK_CATEGORY_ID = 'otros';
/** Valor del filtro de movimientos que muestra todas las categorías */
export const ALL_FILTER = 'todas';

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'Débito',
  'Crédito',
  'Efectivo',
  'Mercado Pago',
  'Transferencia',
];
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'Débito';
export const isPaymentMethod = (v: unknown): v is PaymentMethod =>
  typeof v === 'string' && (PAYMENT_METHODS as readonly string[]).includes(v);

export const CUSTOM_COLORS = [
  '#E0452F',
  '#DB5F1E',
  '#D2851B',
  '#1F7A4C',
  '#0E8579',
  '#2D5FD1',
  '#5B45C7',
  '#8E3EBE',
  '#C33574',
  '#6E7A72',
] as const;
export const CUSTOM_EMOJIS = [
  '🐶',
  '🐱',
  '🎾',
  '⚽',
  '🎮',
  '🎸',
  '📚',
  '✈️',
  '🏋️',
  '💊',
  '💅',
  '☕',
  '🍺',
  '🚬',
  '🚗',
  '🎁',
  '🧾',
  '🏦',
  '🌱',
  '🛠️',
  '👶',
  '🎨',
] as const;
export const DEFAULT_EMOJI = '🏷️';
export const CUSTOM_HINT = 'Categoría tuya';
export const MAX_CUSTOM_CATEGORIES = 24;
export const MAX_NOTE_LENGTH = 60;
export const MAX_CATEGORY_NAME_LENGTH = 22;

/** La porción de la dona que junta las categorías chiquitas ("Otras N cat.") */
export const REST_SLICE_ID = '__resto';
export const REST_SLICE_COLOR = '#9CAAA0';

export interface CategoryLookup {
  all: readonly Category[];
  custom: readonly Category[];
  /** La categoría con ese id; si no existe (la borraron), "Otros". */
  get(id: string): Category;
}

export function createCategoryLookup(custom: readonly Category[]): CategoryLookup {
  const all = [...BUILT_IN_CATEGORIES, ...custom];
  const byId = new Map(all.map((c) => [c.id, c] as const));
  const fallback = byId.get(FALLBACK_CATEGORY_ID) as Category;
  return { all, custom, get: (id) => byId.get(id) ?? fallback };
}
