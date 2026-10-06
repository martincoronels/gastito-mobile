import { useMemo } from 'react';

import { useToast } from '@/components/feedback/ToastProvider';
import { ALL_FILTER } from '@/domain/catalog';
import { buildDemoData } from '@/domain/demo';
import * as ops from '@/domain/operations';
import { sanitizeData } from '@/domain/sanitize';
import { impactMessage } from '@/domain/selectors';
import type { AppData, Category } from '@/domain/types';
import { currentMonth, monthOf, shiftMonth, type MonthKey } from '@/lib/dates';
import { useAppDispatch, useAppState } from './AppStateProvider';
import type { AppAction, ViewId } from './reducer';
import { useCategories } from './useCategories';

type CommitOptions = Omit<Extract<AppAction, { type: 'dataChanged' }>, 'type' | 'data'>;

const CATEGORY_ERRORS: Record<ops.CreateCategoryError, string> = {
  empty: 'Ponele un nombre a la categoría',
  duplicate: 'Ya tenés una categoría con ese nombre',
  limit: 'Llegaste al máximo de categorías propias',
};

const NOT_A_BACKUP = 'Ese archivo no es un backup de Gastito';

/**
 * Las acciones de la app: combinan la operación de dominio, el cambio de estado y el aviso que
 * ve la persona. Las pantallas solo llaman a estas funciones.
 */
export function useAppActions() {
  const { data, ui } = useAppState();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const categories = useCategories();

  return useMemo(() => {
    const commit = (next: AppData, options: CommitOptions = {}) =>
      dispatch({ type: 'dataChanged', data: next, ...options });

    return {
      setView: (view: ViewId) => dispatch({ type: 'viewChanged', view }),
      shiftMonth: (delta: number) => dispatch({ type: 'monthChanged', month: shiftMonth(ui.month, delta) }),
      goToMonth: (month: MonthKey) => dispatch({ type: 'monthChanged', month }),
      toggleSelection: (id: string) => dispatch({ type: 'selectionToggled', id }),
      setFilter: (filter: string) => dispatch({ type: 'filterChanged', filter }),
      setQuery: (query: string) => dispatch({ type: 'queryChanged', query }),

      saveExpense(draft: ops.ExpenseDraft, editingId: string | null) {
        const result = ops.saveExpense(data, draft, editingId);
        commit(result.data, { animate: true, ui: { month: monthOf(draft.date), selected: null } });
        toast(
          result.created
            ? impactMessage(result.data, result.expense, categories.get(result.expense.categoryId))
            : 'Gasto actualizado',
        );
      },

      deleteExpense(id: string) {
        commit(ops.deleteExpense(data, id), { animate: true });
        toast('Gasto eliminado');
      },

      applyFixed() {
        const { data: next, count } = ops.applyPendingFixed(data, ui.month);
        commit(next, { animate: true });
        toast(`${count} ${count === 1 ? 'gasto fijo registrado' : 'gastos fijos registrados'}`);
      },

      toggleFixed(id: string) {
        commit(ops.toggleFixed(data, id));
      },

      deleteFixed(id: string) {
        commit(ops.deleteFixed(data, id));
        toast('Gasto fijo eliminado');
      },

      saveBudget(budget: number | null) {
        commit(ops.setBudget(data, budget));
        toast(budget ? 'Presupuesto guardado' : 'Presupuesto sacado');
      },

      /** Devuelve la categoría creada, o null si no se pudo (y avisa por qué). */
      createCategory(input: { name: string; emoji: string; color: string }): Category | null {
        const result = ops.createCategory(data, input);
        if (!result.ok) {
          toast(CATEGORY_ERRORS[result.reason]);
          return null;
        }
        commit(result.data);
        toast(`Categoría ${result.category.emoji} ${result.category.name} creada`);
        return result.category;
      },

      deleteCategory(id: string) {
        commit(ops.deleteCategory(data, id), {
          animate: true,
          ui: { filter: ui.filter === id ? ALL_FILTER : ui.filter, selected: ui.selected === id ? null : ui.selected },
        });
        toast('Categoría borrada');
      },

      loadDemo() {
        commit(buildDemoData(data.categories), { animate: true, ui: { month: currentMonth() } });
        toast('Datos de ejemplo cargados. Podés borrarlos desde Ajustes.');
      },

      wipeAll() {
        commit(ops.emptyData(), { animate: true });
        toast('Listo, arrancás de cero');
      },

      /** Reemplaza todo con un backup. Devuelve true si se importó. */
      importBackup(json: unknown): boolean {
        const clean = sanitizeData(json);
        if (!clean) {
          toast(NOT_A_BACKUP);
          return false;
        }
        const { data: next, skipped } = clean;
        // si traía cosas y no se salvó ninguna, no es un backup: no se pisa lo que hay
        if (skipped && !next.expenses.length && !next.recurring.length && !next.categories.length) {
          toast(NOT_A_BACKUP);
          return false;
        }
        commit(next, { animate: true });
        toast(
          skipped
            ? `Datos importados. Se ${skipped === 1 ? 'omitió 1 registro' : `omitieron ${skipped} registros`} con formato inválido.`
            : 'Datos importados',
        );
        return true;
      },
    };
  }, [data, ui.month, ui.filter, ui.selected, dispatch, toast, categories]);
}
