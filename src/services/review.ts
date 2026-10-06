import * as StoreReview from 'expo-store-review';

import type { Preferences } from '@/domain/preferences';

const DAY = 24 * 60 * 60 * 1000;
/** Pedir una calificación recién cuando la app ya sirvió: varios gastos anotados en varios días. */
export const REVIEW_MIN_EXPENSES = 10;
export const REVIEW_MIN_DAYS = 4;
/** Y no más de una vez cada cuatro meses (iOS además limita a tres pedidos por año). */
export const REVIEW_COOLDOWN_DAYS = 120;

export function shouldAskForReview(usage: Preferences['usage'], now: number = Date.now()): boolean {
  if (usage.expensesCreated < REVIEW_MIN_EXPENSES) return false;
  if (usage.firstOpenAt == null || now - usage.firstOpenAt < REVIEW_MIN_DAYS * DAY) return false;
  return usage.reviewRequestedAt == null || now - usage.reviewRequestedAt >= REVIEW_COOLDOWN_DAYS * DAY;
}

/**
 * Muestra el cartel nativo de calificación (SKStoreReviewController). iOS decide si aparece o no,
 * y nunca aparece en TestFlight. Se llama en una pausa natural: después de anotar, con la hoja ya
 * cerrada.
 */
export async function requestReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
  } catch {
    // no es importante: si falla, no se insiste
  }
}
