import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Alert, type AlertButton } from 'react-native';

import { PREFERENCES_KEY, STORAGE_KEY } from '@/config';
import { darkColors } from '@/theme';
import App from '../App';

// Un sistema de archivos en memoria con la misma forma que expo-file-system
const mockFiles = new Map<string, string>();
jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get size() {
      return (mockFiles.get(this.uri) ?? '').length;
    }
    create() {
      mockFiles.set(this.uri, '');
    }
    write(content: string) {
      mockFiles.set(this.uri, content);
    }
    async text() {
      return mockFiles.get(this.uri) ?? '';
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return [...mockFiles.keys()].some((k) => k.startsWith(`${this.uri}/`));
    }
    create() {}
    delete() {
      [...mockFiles.keys()].filter((k) => k.startsWith(`${this.uri}/`)).forEach((k) => mockFiles.delete(k));
    }
  }
  return { File, Directory, Paths: { cache: 'cache:' } };
});
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const NOW = new Date(2026, 9, 20, 12);
const press = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await fireEvent.press(el);
};
const answerAlerts = (label: string) =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });

const stored = {
  version: 1,
  expenses: [
    {
      id: 'e1',
      amount: 18400,
      categoryId: 'comida',
      note: '=HYPERLINK("x")',
      date: '2026-10-03',
      method: 'Mercado Pago',
      createdAt: 1,
      recurringId: null,
    },
    {
      id: 'e2',
      amount: 86500,
      categoryId: 'super',
      note: 'Coto',
      date: '2026-10-02',
      method: 'Débito',
      createdAt: 2,
      recurringId: null,
    },
  ],
  recurring: [],
  categories: [],
  settings: { budget: null },
};

describe('datos: exportar, importar, categorías y apariencia', () => {
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
    mockFiles.clear();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('exporta un backup con todos los datos y un CSV sin fórmulas', async () => {
    await render(<App />);
    await press(await screen.findByLabelText('Ajustes'));
    await press(await screen.findByLabelText(/^Exportar backup/));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledTimes(1));
    const [uri, options] = (Sharing.shareAsync as jest.Mock).mock.calls[0];
    expect(uri).toBe('cache:/exports/gastito-2026-10-20.json');
    expect(options).toMatchObject({ mimeType: 'application/json', UTI: 'public.json' });
    expect(JSON.parse(mockFiles.get(uri) ?? '{}').expenses).toHaveLength(2);

    await press(screen.getByLabelText(/^Exportar octubre en CSV/));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledTimes(2));
    const csvUri = (Sharing.shareAsync as jest.Mock).mock.calls[1][0];
    const csv = mockFiles.get(csvUri) ?? '';
    // la fórmula queda como texto (apóstrofo adelante) y las comillas no rompen la celda
    expect(csv).toContain(`"'=HYPERLINK('x')"`);
    // el backup anterior ya no queda en la caché
    expect(mockFiles.has(uri)).toBe(false);
  });

  it('importar pide confirmación, reemplaza los datos y se puede deshacer', async () => {
    const backup = { ...stored, expenses: [{ ...stored.expenses[0], id: 'nuevo', note: 'Del backup' }] };
    mockFiles.set('picked/backup.json', JSON.stringify(backup));
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'picked/backup.json', size: 100, name: 'backup.json' }],
    });
    answerAlerts('Elegir backup');
    await render(<App />);
    await press(await screen.findByLabelText('Ajustes'));
    await press(await screen.findByLabelText(/^Importar backup/));
    expect(await screen.findByText('Datos importados')).toBeTruthy();
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}').expenses).toHaveLength(1),
    );
    // la copia que hizo el selector se borra
    expect(mockFiles.has('picked/backup.json')).toBe(false);

    await press(screen.getByText('Deshacer'));
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}').expenses).toHaveLength(2),
    );
  });

  it('un archivo que no es un backup no toca nada', async () => {
    mockFiles.set('picked/otro.json', JSON.stringify({ hola: 'mundo' }));
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'picked/otro.json', size: 20, name: 'otro.json' }],
    });
    answerAlerts('Elegir backup');
    await render(<App />);
    await press(await screen.findByLabelText('Ajustes'));
    await press(await screen.findByLabelText(/^Importar backup/));
    expect(await screen.findByText('Ese archivo no es un backup de Gastito')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}').expenses).toHaveLength(2);
  });

  it('crea una categoría propia y al borrarla sus gastos pasan a Otros', async () => {
    await render(<App />);
    await press(await screen.findByLabelText('Movimientos'));
    await press(await screen.findByLabelText(/^Coto,/));
    await press(await screen.findByLabelText('Crear una categoría tuya'));
    await fireEvent.changeText(await screen.findByPlaceholderText('Nombre. Ej: Mascotas'), 'Mascotas');
    await press(screen.getByLabelText('Emoji 🐶'));
    await press(screen.getByRole('button', { name: 'Crear categoría' }));
    expect(await screen.findByText('Categoría 🐶 Mascotas creada')).toBeTruthy();
    await press(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(async () => {
      const data = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
      expect(data.expenses.find((e: { id: string }) => e.id === 'e2').categoryId).toMatch(/^mia_/);
    });

    answerAlerts('Borrar');
    await press(screen.getByLabelText('Ajustes'));
    await press(await screen.findByLabelText('Borrar Mascotas'));
    expect(await screen.findByText('Categoría borrada')).toBeTruthy();
    await waitFor(async () => {
      const data = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
      expect(data.categories).toHaveLength(0);
      expect(data.expenses.find((e: { id: string }) => e.id === 'e2').categoryId).toBe('otros');
    });
  });

  it('la apariencia oscura se aplica en el momento y se recuerda', async () => {
    await render(<App />);
    await press(await screen.findByLabelText('Ajustes'));
    await press(await screen.findByRole('radio', { name: 'Oscura' }));
    await waitFor(() => {
      const title = screen.getAllByText('Gastito')[0];
      const flat = [title.props.style].flat(Infinity).reduce((acc, s) => ({ ...acc, ...s }), {});
      expect(flat.color).toBe(darkColors.ink);
    });
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY)) ?? '{}').appearance).toBe('dark'),
    );
  });

  it('el filtro de categoría sigue a la vista al cambiar a un mes sin esos gastos', async () => {
    await render(<App />);
    await press(await screen.findByLabelText('Movimientos'));
    await press(await screen.findByText('Supermercado'));
    await press(screen.getByLabelText('Mes anterior'));
    expect(await screen.findByText('Probá sacando el filtro o buscando otra cosa.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Supermercado', selected: true })).toBeTruthy();
  });

  it('busca sin importar tildes', async () => {
    await render(<App />);
    await press(await screen.findByLabelText('Movimientos'));
    await fireEvent.changeText(await screen.findByLabelText('Buscar por nombre o categoría'), 'supermercado coto');
    expect(await screen.findByText('0 movimientos')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Buscar por nombre o categoría'), 'COTO');
    expect(await screen.findByText('1 movimiento')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Buscar por nombre o categoría'), 'comida y delivery');
    expect(await screen.findByText('1 movimiento')).toBeTruthy();
  });

  it('con VoiceOver, el mes se cambia como un control ajustable', async () => {
    await render(<App />);
    const month = await screen.findByLabelText('Mes');
    expect(month.props.accessibilityValue).toEqual({ text: 'Octubre de 2026' });
    await act(async () => {
      fireEvent(month, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    });
    expect(screen.getByLabelText('Mes').props.accessibilityValue).toEqual({ text: 'Septiembre de 2026' });
    // hacia el futuro no se puede pasar del mes actual
    await act(async () => {
      fireEvent(screen.getByLabelText('Mes'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    await act(async () => {
      fireEvent(screen.getByLabelText('Mes'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    });
    expect(screen.getByLabelText('Mes').props.accessibilityValue).toEqual({ text: 'Octubre de 2026' });
  });
});
