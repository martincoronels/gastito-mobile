import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { STORAGE_KEY } from '@/config';
import App from '../App';

/** 20 de octubre de 2026: el mes de ejemplo trae todos sus gastos del mes. */
const NOW = new Date(2026, 9, 20, 12, 0, 0);

const press = async (element: Parameters<typeof fireEvent.press>[0]) => {
  await fireEvent.press(element);
};
const tab = (name: string) => screen.getByRole('tab', { name });
const stored = async () => JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? 'null');

/** El + flotante y, con la hoja abierta, el botón de guardar: los dos son el último "Anotar gasto". */
const lastAnotar = () => {
  const all = screen.getAllByRole('button', { name: 'Anotar gasto' });
  return all[all.length - 1];
};
async function openNewExpense() {
  await screen.findAllByRole('button', { name: 'Anotar gasto' });
  await press(lastAnotar());
  return screen.findByLabelText('Monto');
}

/** Responde las alertas nativas tocando el botón con ese texto. */
function answerAlerts(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });
}

async function startWithDemo() {
  await render(<App />);
  await press(await screen.findByText('Ver un mes de ejemplo'));
  await screen.findByText('Gastaste');
}

describe('la app completa', () => {
  beforeEach(async () => {
    // solo se fija la fecha: los temporizadores siguen siendo reales
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
        'requestIdleCallback',
        'cancelIdleCallback',
        'hrtime',
        'performance',
      ],
    });
    await AsyncStorage.clear();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('arranca vacía y ofrece cargar un mes de ejemplo', async () => {
    await render(<App />);
    expect(await screen.findByText('Empecemos por el primero')).toBeTruthy();
    await press(screen.getByText('Ver un mes de ejemplo'));
    expect(await screen.findByText('Gastaste')).toBeTruthy();
    expect(screen.getByText(/a esta altura de septiembre/)).toBeTruthy();
  });

  it('borra un gasto desde la lista y lo recupera con Deshacer', async () => {
    await startWithDemo();
    await press(tab('Movimientos'));
    const row = await screen.findByLabelText(/^Cerveza con los chicos,/);
    await act(async () => {
      fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    });
    expect(await screen.findByText('Gasto eliminado')).toBeTruthy();
    expect(screen.queryByLabelText(/^Cerveza con los chicos,/)).toBeNull();

    await press(screen.getByText('Deshacer'));
    expect(await screen.findByLabelText(/^Cerveza con los chicos,/)).toBeTruthy();
  });

  it('anota otra vez un gasto con fecha de hoy', async () => {
    await startWithDemo();
    await press(tab('Movimientos'));
    const row = await screen.findByLabelText(/^Uber a la facu,/);
    await act(async () => {
      fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'duplicate' } });
    });
    expect(await screen.findByText(/Anotado otra vez hoy/)).toBeTruthy();
    expect(screen.getAllByLabelText(/^Uber a la facu,/)).toHaveLength(2);
  });

  it('anota un gasto nuevo y lo guarda en el teléfono', async () => {
    await render(<App />);
    await fireEvent.changeText(await openNewExpense(), '1500');
    await fireEvent.changeText(screen.getByPlaceholderText('Ej: PedidosYa con Vicky'), 'Café');
    await press(lastAnotar());
    expect(await screen.findByText(/Anotado\. Van \$\s1\.500 en comida y delivery este mes/)).toBeTruthy();

    await waitFor(async () => expect((await stored())?.expenses).toHaveLength(1));
    expect((await stored()).expenses[0]).toMatchObject({ amount: 1500, note: 'Café', date: '2026-10-20' });
  });

  it('no deja anotar un gasto sin monto', async () => {
    await render(<App />);
    await openNewExpense();
    await press(lastAnotar());
    expect(await screen.findByText('Poné un monto mayor a cero')).toBeTruthy();
  });

  it('avisa al pasarse del presupuesto (y solo al cruzarlo)', async () => {
    // el ejemplo trae $ 600.000 de presupuesto y, al día 20, $ 569.700 gastados en octubre
    await startWithDemo();
    await fireEvent.changeText(await openNewExpense(), '20000');
    await press(lastAnotar());
    // 589.700: ya estaba arriba del 80% y no llega al 100%, así que no hay aviso de presupuesto
    expect(await screen.findByText(/^Van \$/)).toBeTruthy();

    await fireEvent.changeText(await openNewExpense(), '20000');
    await press(lastAnotar());
    expect(await screen.findByText('Te pasaste del presupuesto de octubre por $\u00a09.700')).toBeTruthy();
  });

  it('borrar todo pide confirmación y se puede deshacer', async () => {
    await startWithDemo();
    answerAlerts('Borrar todo');
    await press(screen.getByLabelText('Ajustes'));
    await press(await screen.findByLabelText('Borrar todo'));
    expect(await screen.findByText('Listo, arrancás de cero')).toBeTruthy();
    expect(await screen.findByText('Empecemos por el primero')).toBeTruthy();

    await press(screen.getByText('Deshacer'));
    expect(await screen.findByText('Gastaste')).toBeTruthy();
  });

  it('si se cancela la confirmación, no se borra nada', async () => {
    await startWithDemo();
    answerAlerts('Cancelar');
    await press(screen.getByLabelText('Ajustes'));
    await press(await screen.findByLabelText('Borrar todo'));
    expect(screen.queryByText('Listo, arrancás de cero')).toBeNull();
  });

  it('el presupuesto se escribe con puntos de miles y se guarda', async () => {
    await render(<App />);
    await press(await screen.findByLabelText('Ajustes'));
    const field = await screen.findByLabelText('Presupuesto mensual');
    await fireEvent.changeText(field, '450000');
    expect(field.props.value).toBe('450.000');
    await press(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Presupuesto de $ 450.000 por mes')).toBeTruthy();
  });

  it('registra los fijos pendientes desde el aviso', async () => {
    await startWithDemo();
    await press(tab('Fijos'));
    // en el ejemplo los fijos del mes ya están registrados
    expect(screen.queryByText(/sin registrar en octubre/)).toBeNull();
    const list = screen.getByLabelText(/^Internet,/);
    expect(within(list).getByText('Internet')).toBeTruthy();
  });
});
