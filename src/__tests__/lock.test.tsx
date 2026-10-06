import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { PREFERENCES_KEY, STORAGE_KEY } from '@/config';
import App from '../App';

jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  getEnrolledLevelAsync: jest.fn(async () => 3),
  supportedAuthenticationTypesAsync: jest.fn(async () => [2]),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));
jest.mock('expo-screen-capture', () => ({
  enableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
  disableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
}));

const auth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

const data = {
  version: 1,
  expenses: [
    {
      id: 'e1',
      amount: 4300,
      categoryId: 'salidas',
      note: 'Café',
      date: '2026-10-02',
      method: 'Efectivo',
      createdAt: 1,
      recurringId: null,
    },
  ],
  recurring: [],
  categories: [],
  settings: { budget: null },
};

/** Captura los listeners de AppState para simular ir y volver de segundo plano. */
function captureAppState() {
  const listeners: ((s: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => {
    if (type === 'change') listeners.push(fn as (s: AppStateStatus) => void);
    return { remove: () => listeners.splice(listeners.indexOf(fn as never), 1) } as never;
  });
  return (state: AppStateStatus) =>
    act(async () => {
      Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });
      listeners.slice().forEach((fn) => fn(state));
    });
}

describe('bloqueo con Face ID', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    auth.getEnrolledLevelAsync.mockResolvedValue(3 as never);
    auth.authenticateAsync.mockResolvedValue({ success: true });
  });
  afterEach(() => jest.restoreAllMocks());

  it('con el bloqueo activado, arranca tapada y pide Face ID solo', async () => {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify({ lock: true }));
    auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await render(<App />);
    expect(await screen.findByText('Bloqueado')).toBeTruthy();
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalledTimes(1));
    // se canceló: queda bloqueada, con el botón
    expect(screen.getByText('Bloqueado')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Desbloquear con Face ID' }));
    await waitFor(() => expect(screen.queryByText('Bloqueado')).toBeNull());
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(2);
  });

  it('se vuelve a bloquear al volver de segundo plano', async () => {
    const setAppState = captureAppState();
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify({ lock: true }));
    await render(<App />);
    await waitFor(() => expect(screen.queryByText('Bloqueado')).toBeNull());

    await setAppState('inactive');
    // en el selector de apps se ve la marca, no los datos
    expect(screen.getByText('Gastito', { exact: true })).toBeTruthy();
    await setAppState('background');
    await setAppState('active');
    expect(await screen.findByText('Bloqueado')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Bloqueado')).toBeNull());
  });

  it('activarlo y desactivarlo piden confirmar con Face ID', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByLabelText('Ajustes'));
    const toggle = await screen.findByLabelText('Bloquear con Face ID');

    auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'authentication_failed' });
    await act(async () => fireEvent(toggle, 'valueChange', true));
    await waitFor(() => expect(auth.authenticateAsync).toHaveBeenCalledTimes(1));
    expect(JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? '{}').lock).not.toBe(true);

    await act(async () => fireEvent(toggle, 'valueChange', true));
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? '{}').lock).toBe(true),
    );
    // activarlo no bloquea en el momento (la persona ya está adentro)
    expect(screen.queryByText('Bloqueado')).toBeNull();

    await act(async () => fireEvent(toggle, 'valueChange', false));
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? '{}').lock).toBe(false),
    );
  });

  it('si el iPhone ya no tiene código, desactiva el bloqueo en vez de dejar a la persona afuera', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify({ lock: true }));
    auth.getEnrolledLevelAsync.mockResolvedValue(0 as never);
    await render(<App />);
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Bloqueo desactivado', expect.any(String)));
    await waitFor(() => expect(screen.queryByText('Bloqueado')).toBeNull());
    expect(auth.authenticateAsync).not.toHaveBeenCalled();
    // la pantalla de bloqueo termina de irse (queda solo el "Gastito" del encabezado)
    await waitFor(() => expect(screen.getAllByText('Gastito', { exact: true })).toHaveLength(1));
  });
});
