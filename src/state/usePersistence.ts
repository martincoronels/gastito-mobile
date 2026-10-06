import { useCallback, useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';

import type { AppData } from '@/domain/types';
import type { DataRepository } from '@/storage/DataRepository';

/**
 * Guarda los datos cada vez que cambian (agrupando cambios seguidos en 120 ms, como la web) y
 * fuerza el guardado cuando la app pasa a segundo plano: iOS puede cerrarla en cualquier momento.
 * Si un guardado falla, los datos quedan pendientes y se reintentan con el próximo cambio o al
 * pasar a segundo plano.
 */
export function usePersistence(data: AppData | null, repository: DataRepository, onError?: () => void) {
  const lastSeen = useRef<AppData | null>(null);
  const pending = useRef<AppData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const errorHandler = useRef(onError);
  useEffect(() => {
    errorHandler.current = onError;
  }, [onError]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    void repository.save(next).then((ok) => {
      if (ok) return;
      // si mientras tanto no llegó nada más nuevo, se vuelve a intentar más tarde
      if (!pending.current) pending.current = next;
      errorHandler.current?.();
    });
  }, [repository]);

  useEffect(() => {
    if (!data) return;
    if (lastSeen.current === null) {
      lastSeen.current = data; // lo recién cargado ya está guardado
      return;
    }
    if (data === lastSeen.current) return;
    lastSeen.current = data;
    pending.current = data;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 120);
  }, [data, flush]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (status) => {
      if (status !== 'active') flush();
    });
    return () => {
      sub.remove();
      flush();
    };
  }, [flush]);
}
