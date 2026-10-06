import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Alert, Linking } from 'react-native';

import { PREFERENCES_KEY, STORAGE_KEY } from '@/config';
import App from '../App';

jest.mock('expo-notifications', () => {
  const listeners: ((r: unknown) => void)[] = [];
  return {
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: jest.fn(),
    setNotificationCategoryAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    scheduleNotificationAsync: jest.fn(async () => 'id'),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
    getLastNotificationResponse: jest.fn(() => null),
    clearLastNotificationResponse: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn((fn: (r: unknown) => void) => {
      listeners.push(fn);
      return { remove: () => listeners.splice(listeners.indexOf(fn), 1) };
    }),
    __emit: (response: unknown) => listeners.forEach((fn) => fn(response)),
  };
});

const mocked = Notifications as jest.Mocked<typeof Notifications> & { __emit: (r: unknown) => void };
const NOW = new Date(2026, 9, 6, 12, 0, 0); // 6 de octubre: Netflix y Spotify (día 7) todavía no vencieron

const press = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await fireEvent.press(el);
};

/** Datos con un fijo (Internet, el 5) vencido y sin registrar en octubre. */
const withPendingFixed = {
  version: 1,
  expenses: [],
  recurring: [
    {
      id: 'net',
      amount: 32000,
      categoryId: 'hogar',
      note: 'Internet',
      method: 'Débito',
      day: 5,
      since: '2026-09',
      active: true,
    },
  ],
  categories: [],
  settings: { budget: null },
};

describe('recordatorios y links', () => {
  beforeEach(async () => {
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'hrtime',
        'performance',
      ],
    });
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('no pide permiso al abrir la app; lo pide al activar un recordatorio y programa los avisos', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withPendingFixed));
    await render(<App />);
    await screen.findByText(/sin registrar en octubre/);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();

    await press(screen.getByLabelText('Ajustes'));
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    await act(async () => {
      fireEvent(await screen.findByLabelText('Gastos fijos'), 'valueChange', true);
    });
    await waitFor(() => expect(mocked.scheduleNotificationAsync).toHaveBeenCalled(), { timeout: 3000 });
    const ids = mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req.identifier);
    // el de octubre ya venció (está como pendiente en la app): se avisan noviembre y diciembre
    expect(ids).toEqual(['fixed-2026-11-05', 'fixed-2026-12-05']);
    const saved = JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? '{}');
    expect(saved.reminders.fixed).toBe(true);
  });

  it('si se negó el permiso, explica cómo activarlo y no activa nada', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);
    await render(<App />);
    await press(await screen.findByLabelText('Ajustes'));
    await act(async () => {
      fireEvent(await screen.findByLabelText('Recordatorio diario'), 'valueChange', true);
    });
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Activá las notificaciones', expect.any(String), expect.any(Array)),
    );
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('"Registrar" en la notificación registra el fijo y abre Fijos', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withPendingFixed));
    await render(<App />);
    await screen.findByText(/sin registrar en octubre/);
    await act(async () => {
      mocked.__emit({
        actionIdentifier: 'register',
        notification: {
          request: { content: { data: { kind: 'fixed', month: '2026-10', url: 'gastito://fijos?mes=2026-10' } } },
        },
      });
    });
    expect(await screen.findByText('1 gasto fijo registrado')).toBeTruthy();
    expect(screen.getByText('Gastos fijos')).toBeTruthy();
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
      expect(stored.expenses).toHaveLength(1);
    });
  });

  it('un link gastito://anotar abre el formulario precargado (sin anotar nada solo)', async () => {
    jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue('gastito://anotar?monto=1500&categoria=super&nota=Verduler%C3%ADa');
    await render(<App />);
    const amount = await screen.findByLabelText('Monto');
    expect(amount.props.value).toBe('1.500');
    expect(screen.getByDisplayValue('Verdulería')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Supermercado', selected: true })).toBeTruthy();
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(stored).toBeNull();
  });

  it('un link desconocido no hace nada', async () => {
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('gastito://borrar-todo');
    await render(<App />);
    expect(await screen.findByText('Empecemos por el primero')).toBeTruthy();
    expect(screen.queryByLabelText('Monto')).toBeNull();
  });
});
