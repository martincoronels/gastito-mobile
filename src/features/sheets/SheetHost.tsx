import { useState } from 'react';

import { BottomSheet } from '@/components/sheet/BottomSheet';
import type { Expense } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';
import { useSheet, useSheetState } from '@/state/SheetProvider';
import { ExpenseSheet } from '../expense/ExpenseSheet';
import { SettingsSheet } from '../settings/SettingsSheet';

/** Muestra la hoja que esté pedida (anotar/editar gasto o ajustes). */
export function SheetHost() {
  const { request, open, instance, onClosed } = useSheetState();
  const sheet = useSheet();
  const { data } = useAppState();

  const find = (): Expense | null => {
    if (request?.kind !== 'expense' || !request.expenseId) return null;
    return data.expenses.find((e) => e.id === request.expenseId) ?? null;
  };
  // el gasto se toma al abrir la hoja: si se borra, la hoja no cambia mientras baja
  const [snapshot, setSnapshot] = useState(() => ({ instance, expense: find() }));
  if (snapshot.instance !== instance) setSnapshot({ instance, expense: find() });

  if (!request) return null;
  const title = request.kind === 'settings' ? 'Ajustes' : snapshot.expense ? 'Editar gasto' : 'Anotar gasto';
  return (
    <BottomSheet open={open} title={title} onRequestClose={sheet.close} onClosed={onClosed}>
      {request.kind === 'settings' ? (
        <SettingsSheet key={instance} />
      ) : (
        <ExpenseSheet key={instance} expense={snapshot.expense} prefill={request.prefill} />
      )}
    </BottomSheet>
  );
}
