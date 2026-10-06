import AsyncStorage from '@react-native-async-storage/async-storage';

import { RECOVERY_KEY, STORAGE_KEY } from '@/config';
import type { DataRepository } from './DataRepository';

/** Guarda todo como un JSON en el almacenamiento local de la app (el equivalente a localStorage). */
export const asyncStorageRepository: DataRepository = {
  async load() {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
      return { status: 'error' };
    }
    if (raw == null || raw === '') return { status: 'empty' };
    try {
      return { status: 'ok', raw: JSON.parse(raw) as unknown };
    } catch {
      await asyncStorageRepository.preserve(raw);
      return { status: 'corrupt' };
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
  async preserve(raw) {
    try {
      await AsyncStorage.setItem(RECOVERY_KEY, raw);
    } catch {
      // si tampoco se puede guardar la copia, no hay nada más que hacer
    }
  },
  async discardPreserved() {
    try {
      await AsyncStorage.removeItem(RECOVERY_KEY);
    } catch {
      // si no estaba, no hay nada que borrar
    }
  },
};
