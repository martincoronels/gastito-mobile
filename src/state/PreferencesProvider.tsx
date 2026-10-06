import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { defaultPreferences, sanitizePreferences, type Preferences } from '@/domain/preferences';
import type { PreferencesRepository } from '@/storage/preferencesRepository';

interface PreferencesApi {
  prefs: Preferences;
  /** Ya se leyeron las preferencias guardadas */
  ready: boolean;
  update: (change: (current: Preferences) => Preferences) => void;
}

const PreferencesContext = createContext<PreferencesApi | null>(null);

/** Preferencias de este dispositivo (apariencia, recordatorios, bloqueo), guardadas aparte de los datos. */
export function PreferencesProvider({
  repository,
  children,
}: {
  repository: PreferencesRepository;
  children: ReactNode;
}) {
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [ready, setReady] = useState(false);
  const loaded = useRef<Preferences | null>(null);

  useEffect(() => {
    let active = true;
    void repository.load().then((raw) => {
      if (!active) return;
      const clean = sanitizePreferences(raw);
      loaded.current = clean;
      // la primera vez se anota cuándo se abrió (es distinto de lo leído, así que se guarda)
      setPrefs(
        clean.usage.firstOpenAt == null ? { ...clean, usage: { ...clean.usage, firstOpenAt: Date.now() } } : clean,
      );
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [repository]);

  // se guarda cada cambio (no lo recién leído)
  useEffect(() => {
    if (!ready || prefs === loaded.current) return;
    void repository.save(prefs);
  }, [prefs, ready, repository]);

  const update = useCallback((change: (current: Preferences) => Preferences) => setPrefs(change), []);
  const api = useMemo(() => ({ prefs, ready, update }), [prefs, ready, update]);
  return <PreferencesContext value={api}>{children}</PreferencesContext>;
}

export function usePreferences(): PreferencesApi {
  const api = useContext(PreferencesContext);
  if (!api) throw new Error('usePreferences tiene que usarse dentro de <PreferencesProvider>');
  return api;
}
