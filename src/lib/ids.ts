import * as Crypto from 'expo-crypto';

/** Identificador único para gastos y fijos (UUID v4, generado por el sistema). */
export const uid = (): string => Crypto.randomUUID();
