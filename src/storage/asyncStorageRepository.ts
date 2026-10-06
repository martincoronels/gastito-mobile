import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY } from '@/config';
import type { DataRepository } from './DataRepository';

/** Guarda todo como un JSON en el almacenamiento local de la app (el equivalente a localStorage). */
export const asyncStorageRepository: DataRepository = {
  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  },
  async save(data) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};
