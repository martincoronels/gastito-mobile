import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';

import { emptyData } from '@/domain/operations';
import { sanitizeData } from '@/domain/sanitize';
import type { DataRepository } from '@/storage/DataRepository';
import { appReducer, createInitialState, type AppAction, type AppState } from './reducer';
import { usePersistence } from './usePersistence';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<AppAction> | null>(null);
const RetryContext = createContext<() => void>(() => {});

interface AppStateProviderProps {
  repository: DataRepository;
  /** Si un guardado falla (por ejemplo, el teléfono sin espacio) */
  onSaveError?: () => void;
  children: ReactNode;
}

/** Estado global: los datos (cargados y guardados con el repositorio) y el estado de la pantalla. */
export function AppStateProvider({ repository, onSaveError, children }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => createInitialState());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    repository
      .load()
      .catch(() => ({ status: 'error' }) as const)
      .then(async (result) => {
        if (!active) return;
        if (result.status === 'error') {
          // no se pudo leer: no se arranca vacío, porque el próximo guardado pisaría los datos
          dispatch({ type: 'loadFailed' });
          return;
        }
        if (result.status === 'empty') {
          dispatch({ type: 'hydrated', data: emptyData() });
          return;
        }
        if (result.status === 'corrupt') {
          dispatch({ type: 'hydrated', data: emptyData(), issue: 'recovered' });
          return;
        }
        const clean = sanitizeData(result.raw);
        if (!clean) {
          await repository.preserve(JSON.stringify(result.raw));
          if (active) dispatch({ type: 'hydrated', data: emptyData(), issue: 'recovered' });
          return;
        }
        dispatch({ type: 'hydrated', data: clean.data });
      });
    return () => {
      active = false;
    };
  }, [repository, attempt]);

  const retry = useCallback(() => {
    dispatch({ type: 'loadRetried' });
    setAttempt((n) => n + 1);
  }, []);

  usePersistence(state.status === 'ready' ? state.data : null, repository, onSaveError);

  return (
    <DispatchContext value={dispatch}>
      <RetryContext value={retry}>
        <StateContext value={state}>{children}</StateContext>
      </RetryContext>
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

/** Vuelve a intentar leer los datos (cuando la primera lectura falló). */
export const useRetryLoad = () => useContext(RetryContext);
