import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState as RNAppState, type AppStateStatus } from 'react-native';

import { haptics } from '@/lib/haptics';
import { authenticate, getLockCapability, setAppSwitcherShield, type LockCapability } from '@/services/lock';
import { usePreferences } from './PreferencesProvider';

interface LockApi {
  /** Hay que desbloquear para ver la app */
  locked: boolean;
  /** La app no está activa (selector de apps, Centro de control…) y hay que taparla */
  shielded: boolean;
  /** Se está mostrando el cartel de Face ID */
  authenticating: boolean;
  capability: LockCapability | null;
  unlock: () => Promise<void>;
  /** Activan o desactivan el bloqueo; las dos piden Face ID antes. Devuelven si se hizo. */
  enableLock: () => Promise<boolean>;
  disableLock: () => Promise<boolean>;
}

const LockContext = createContext<LockApi | null>(null);

/**
 * Bloqueo con Face ID: al abrir la app y cada vez que vuelve de segundo plano. Mientras la app no
 * está activa, si el bloqueo está prendido, se tapa (así el selector de apps no muestra montos).
 */
export function LockProvider({ children }: { children: ReactNode }) {
  const { prefs, ready, update } = usePreferences();
  const [unlocked, setUnlocked] = useState(false);
  const [shielded, setShielded] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [capability, setCapability] = useState<LockCapability | null>(null);
  const enabled = prefs.lock;
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
    void setAppSwitcherShield(enabled);
  }, [enabled]);

  const refreshCapability = useCallback(async () => {
    const next = await getLockCapability();
    setCapability(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    void getLockCapability().then((next) => active && setCapability(next));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        setShielded(false);
        void refreshCapability();
        return;
      }
      if (!enabledRef.current) return;
      setShielded(true);
      // al irse a segundo plano se vuelve a bloquear (el cartel de Face ID no cuenta: deja la app "inactiva")
      if (state === 'background') setUnlocked(false);
    });
    return () => sub.remove();
  }, [refreshCapability]);

  const locked = ready && enabled && !unlocked;

  const unlock = useCallback(async () => {
    if (authenticating) return;
    const current = await refreshCapability();
    if (!current.available) {
      // sin código en el iPhone no hay con qué verificar: cualquiera que lo tenga ya puede abrirlo todo
      update((p) => ({ ...p, lock: false }));
      setUnlocked(true);
      Alert.alert(
        'Bloqueo desactivado',
        'Tu iPhone ya no tiene un código configurado, así que Gastito no puede pedir Face ID. Configurá un código en Ajustes de iOS para volver a activarlo.',
      );
      return;
    }
    setAuthenticating(true);
    const result = await authenticate('Desbloqueá Gastito');
    setAuthenticating(false);
    if (result === 'ok') {
      haptics.success();
      setUnlocked(true);
    } else if (result === 'failed') {
      haptics.error();
    }
  }, [authenticating, refreshCapability, update]);

  const confirmChange = useCallback(
    async (message: string): Promise<boolean> => {
      const current = await refreshCapability();
      if (!current.available) {
        Alert.alert(
          'Configurá un código en el iPhone',
          'Para bloquear Gastito, el iPhone tiene que tener un código (y si querés, Face ID). Se configura en Ajustes de iOS → Face ID y código.',
        );
        return false;
      }
      setAuthenticating(true);
      const result = await authenticate(message);
      setAuthenticating(false);
      if (result !== 'ok') {
        if (result === 'failed') haptics.error();
        return false;
      }
      haptics.success();
      return true;
    },
    [refreshCapability],
  );

  const enableLock = useCallback(async () => {
    if (!(await confirmChange('Confirmá para activar el bloqueo'))) return false;
    setUnlocked(true);
    update((p) => ({ ...p, lock: true }));
    return true;
  }, [confirmChange, update]);

  const disableLock = useCallback(async () => {
    if (!(await confirmChange('Confirmá para desactivar el bloqueo'))) return false;
    update((p) => ({ ...p, lock: false }));
    return true;
  }, [confirmChange, update]);

  const api = useMemo(
    () => ({
      locked,
      shielded: enabled && shielded,
      authenticating,
      capability,
      unlock,
      enableLock,
      disableLock,
    }),
    [locked, enabled, shielded, authenticating, capability, unlock, enableLock, disableLock],
  );
  return <LockContext value={api}>{children}</LockContext>;
}

export function useLock(): LockApi {
  const api = useContext(LockContext);
  if (!api) throw new Error('useLock tiene que usarse dentro de <LockProvider>');
  return api;
}
