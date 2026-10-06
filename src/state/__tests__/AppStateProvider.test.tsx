import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { emptyData } from '@/domain/operations';
import type { AppData } from '@/domain/types';
import type { DataRepository, LoadResult } from '@/storage/DataRepository';
import { AppStateProvider, useAppDispatch, useAppState, useRetryLoad } from '../AppStateProvider';

function fakeRepository(results: LoadResult[]) {
  const saved: AppData[] = [];
  const preserved: string[] = [];
  const repository: DataRepository = {
    load: jest.fn(async (): Promise<LoadResult> => results.shift() ?? { status: 'empty' }),
    save: jest.fn(async (data: AppData) => {
      saved.push(data);
      return true;
    }),
    preserve: jest.fn(async (raw: string) => {
      preserved.push(raw);
    }),
  };
  return { repository, saved, preserved };
}

const useAll = () => ({ state: useAppState(), dispatch: useAppDispatch(), retry: useRetryLoad() });

async function setup(repository: DataRepository) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStateProvider repository={repository}>{children}</AppStateProvider>
  );
  return renderHook(useAll, { wrapper });
}

const withExpense = (data: AppData): AppData => ({
  ...data,
  expenses: [
    {
      id: 'e1',
      amount: 1500,
      categoryId: 'super',
      note: 'Verdulería',
      date: '2026-10-02',
      method: 'Efectivo',
      createdAt: 1,
      recurringId: null,
    },
  ],
});

describe('carga de datos', () => {
  it('si no se pudo leer, no arranca vacía ni guarda encima; reintentar vuelve a leer', async () => {
    const stored = withExpense(emptyData());
    const { repository, saved } = fakeRepository([{ status: 'error' }, { status: 'ok', raw: stored }]);
    const { result } = await setup(repository);

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    await act(async () => {
      result.current.dispatch({ type: 'dataChanged', data: emptyData() });
    });
    expect(saved).toHaveLength(0);

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.data.expenses).toHaveLength(1);
  });

  it('si lo guardado no tiene el formato de Gastito, guarda una copia antes de arrancar de cero', async () => {
    const { repository, preserved } = fakeRepository([{ status: 'ok', raw: { algo: 'raro' } }]);
    const { result } = await setup(repository);
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.issue).toBe('recovered');
    expect(preserved).toEqual([JSON.stringify({ algo: 'raro' })]);
  });

  it('avisa una sola vez que los datos estaban dañados', async () => {
    const { repository } = fakeRepository([{ status: 'corrupt' }]);
    const { result } = await setup(repository);
    await waitFor(() => expect(result.current.state.issue).toBe('recovered'));
    await act(async () => result.current.dispatch({ type: 'issueSeen' }));
    expect(result.current.state.issue).toBeNull();
  });

  it('guarda los cambios (y no lo recién cargado)', async () => {
    jest.useFakeTimers();
    try {
      const { repository, saved } = fakeRepository([{ status: 'empty' }]);
      const { result } = await setup(repository);
      await waitFor(() => expect(result.current.state.status).toBe('ready'));
      expect(saved).toHaveLength(0);
      await act(async () => {
        result.current.dispatch({ type: 'dataChanged', data: withExpense(emptyData()) });
      });
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      expect(saved).toHaveLength(1);
      expect(saved[0].expenses[0].id).toBe('e1');
    } finally {
      jest.useRealTimers();
    }
  });
});
