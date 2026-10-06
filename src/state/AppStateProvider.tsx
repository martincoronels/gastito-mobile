import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';

import { emptyData } from '@/domain/operations';
import { sanitizeData } from '@/domain/sanitize';
import type { DataRepository } from '@/storage/DataRepository';
import { appReducer, createInitialState, type AppAction, type AppState } from './reducer';
import { usePersistence } from './usePersistence';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<AppAction> | null>(null);

/** Estado global: los datos (cargados y guardados con el repositorio) y el estado de la pantalla. */
export function AppStateProvider({ repository, children }: { repository: DataRepository; children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => createInitialState());

  useEffect(() => {
    let active = true;
    repository
      .load()
      .catch(() => null)
      .then((raw) => {
        if (!active) return;
        const clean = sanitizeData(raw);
        dispatch({ type: 'hydrated', data: clean ? clean.data : emptyData() });
      });
    return () => {
      active = false;
    };
  }, [repository]);

  usePersistence(state.status === 'ready' ? state.data : null, repository);

  return (
    <DispatchContext value={dispatch}>
      <StateContext value={state}>{children}</StateContext>
    </DispatchContext>
  );
}

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useAppState tiene que usarse dentro de <AppStateProvider>');
  return state;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error('useAppDispatch tiene que usarse dentro de <AppStateProvider>');
  return dispatch;
}
