import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard } from 'react-native';

import type { ExpensePrefill } from '@/domain/links';

export type SheetRequest =
  { kind: 'expense'; expenseId: string | null; prefill?: ExpensePrefill } | { kind: 'settings' };

interface SheetApi {
  /** Abre el formulario: para editar un gasto (con su id) o para uno nuevo (opcionalmente precargado) */
  openExpense: (expenseId?: string | null, prefill?: ExpensePrefill) => void;
  openSettings: () => void;
  close: () => void;
}

interface SheetState {
  request: SheetRequest | null;
  open: boolean;
  /** Cambia en cada apertura, para que el formulario arranque de cero */
  instance: number;
  onClosed: () => void;
}

const ApiContext = createContext<SheetApi | null>(null);
const StateContext = createContext<SheetState | null>(null);

/** Qué hoja está abierta. El contenido se mantiene mientras baja y se desarma al terminar. */
export function SheetProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<SheetRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);
  const isOpen = useRef(false);

  const api = useMemo<SheetApi>(() => {
    const show = (next: SheetRequest) => {
      isOpen.current = true;
      setRequest(next);
      setInstance((n) => n + 1);
      setOpen(true);
    };
    return {
      openExpense: (expenseId = null, prefill) => show({ kind: 'expense', expenseId, prefill }),
      openSettings: () => show({ kind: 'settings' }),
      close: () => {
        isOpen.current = false;
        Keyboard.dismiss(); // primero se va el teclado, así no queda flotando mientras baja la hoja
        setOpen(false);
      },
    };
  }, []);

  const onClosed = useCallback(() => {
    if (!isOpen.current) setRequest(null); // si se volvió a abrir mientras bajaba, no se desarma
  }, []);

  const state = useMemo(() => ({ request, open, instance, onClosed }), [request, open, instance, onClosed]);

  return (
    <ApiContext value={api}>
      <StateContext value={state}>{children}</StateContext>
    </ApiContext>
  );
}

export function useSheet(): SheetApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useSheet tiene que usarse dentro de <SheetProvider>');
  return api;
}

export function useSheetState(): SheetState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useSheetState tiene que usarse dentro de <SheetProvider>');
  return state;
}
