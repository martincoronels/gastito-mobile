/* eslint-disable @typescript-eslint/no-require-imports */
// Entorno de los tests: módulos nativos reemplazados por versiones en memoria.
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  // el mock oficial no trae este hook
  return { ...mock, useReducedMotion: () => false };
});
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// ids únicos de verdad (el simulado de jest-expo devuelve siempre lo mismo)
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));

// ReanimatedSwipeable avisa que mezcla callbacks worklet y no worklet: pasa solo en Jest, que usa la
// versión precompilada de gesture-handler (en la app, Metro compila su código con el plugin de
// worklets). Se filtra solo ese mensaje.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Some of the callbacks in the gesture are worklets')) return;
  originalError(...args);
};

// expo-notifications avisa que en Expo Go para Android no hay notificaciones push: Gastito no usa
// push (solo avisos locales) y es solo para iPhone.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Android Push notifications (remote notifications)')) return;
  originalWarn(...args);
};
