import type { AppData } from '@/domain/types';

/**
 * Dónde viven los datos. Hoy es el propio teléfono; si mañana Gastito necesita una base de
 * datos o una API, se escribe otra implementación de esta interfaz y el resto no se toca.
 */
export interface DataRepository {
  /** Lo guardado, tal cual (se valida después con sanitizeData). null si no hay nada. */
  load(): Promise<unknown>;
  save(data: AppData): Promise<boolean>;
}
