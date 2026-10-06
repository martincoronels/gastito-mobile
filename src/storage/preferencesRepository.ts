import AsyncStorage from '@react-native-async-storage/async-storage';

import { PREFERENCES_KEY } from '@/config';
import type { Preferences } from '@/domain/preferences';

export interface PreferencesRepository {
  /** Lo guardado, tal cual (se valida con sanitizePreferences). null si no hay nada o no se pudo leer. */
  load(): Promise<unknown>;
  save(preferences: Preferences): Promise<void>;
}

export const asyncStoragePreferences: PreferencesRepository = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  },
  async save(preferences) {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // son preferencias: si no se guardan, la próxima vez se usan las de siempre
    }
  },
};
