import { useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';

import { anyReminderOn, planReminders } from '@/domain/reminders';
import { cancelAllReminders, configureNotifications, getPermission, syncReminders } from '@/services/notifications';
import { useAppState } from './AppStateProvider';
import { usePreferences } from './PreferencesProvider';

/** Los cambios seguidos (anotar varios gastos) se juntan antes de reprogramar. */
const DEBOUNCE_MS = 800;

/**
 * Mantiene programados los recordatorios según los datos y las preferencias: al anotar o registrar
 * un fijo, su aviso desaparece; al abrir la app, los diarios se renuevan. Con todo apagado (o sin
 * permiso), no queda ningún aviso programado.
 */
export function useReminderSync() {
  const { data, status } = useAppState();
  const { prefs, ready } = usePreferences();
  const { reminders, lock } = prefs;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sync = useRef<() => void>(() => {});

  useEffect(() => {
    void configureNotifications();
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !ready) return;
    sync.current = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void (async () => {
          try {
            if (!anyReminderOn(reminders) || (await getPermission()) !== 'granted') {
              await cancelAllReminders();
              return;
            }
            // con el bloqueo activado, los avisos no muestran montos en la pantalla bloqueada
            await syncReminders(planReminders(data, reminders, new Date(), { hideAmounts: lock }));
          } catch {
            // si iOS no deja programar, se reintenta con el próximo cambio
          }
        })();
      }, DEBOUNCE_MS);
    };
    sync.current();
  }, [data, reminders, lock, status, ready]);

  // al volver a la app (puede haber cambiado el día) se renuevan los avisos
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') sync.current();
    });
    return () => {
      sub.remove();
      clearTimeout(timer.current);
    };
  }, []);
}
