import type { AppData } from '@/domain/types';

/**
 * Resultado de leer lo guardado:
 * - `empty`: no hay nada (primera vez que se abre la app).
 * - `ok`: lo guardado, tal cual (se valida después con sanitizeData).
 * - `corrupt`: había algo pero no se pudo interpretar; ya se guardó una copia aparte.
 * - `error`: no se pudo leer (por ejemplo, el almacenamiento no respondió). No hay que guardar
 *   encima: los datos pueden seguir ahí.
 */
export type LoadResult =
  { status: 'empty' } | { status: 'ok'; raw: unknown } | { status: 'corrupt' } | { status: 'error' };

/**
 * Dónde viven los datos. Hoy es el propio teléfono; si mañana Gastito necesita una base de
 * datos o una API, se escribe otra implementación de esta interfaz y el resto no se toca.
 */
export interface DataRepository {
  load(): Promise<LoadResult>;
  save(data: AppData): Promise<boolean>;
  /** Guarda aparte algo que no se pudo interpretar, para no perderlo al guardar encima. */
  preserve(raw: string): Promise<void>;
  /** Borra esa copia aparte (cuando la persona borra todo). */
  discardPreserved(): Promise<void>;
}
