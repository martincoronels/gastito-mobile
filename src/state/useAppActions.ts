import { useMemo } from 'react';

import { useToast } from '@/components/feedback/ToastProvider';
import { ALL_FILTER } from '@/domain/catalog';
import { buildDemoData } from '@/domain/demo';
import * as ops from '@/domain/operations';
import { sanitizeData } from '@/domain/sanitize';
import { budgetAlert, expensesInMonth, impactMessage, sumOf } from '@/domain/selectors';
import type { AppData, Category } from '@/domain/types';
import { currentMonth, monthName, monthOf, shiftMonth, today, type MonthKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { money } from '@/lib/money';
import { requestReview, shouldAskForReview } from '@/services/review';
import { useAppDispatch, useAppState } from './AppStateProvider';
import { usePreferences } from './PreferencesProvider';
import type { AppAction, ViewId } from './reducer';
import { useCategories } from './useCategories';

type CommitOptions = Omit<Extract<AppAction, { type: 'dataChanged' }>, 'type' | 'data'>;

const CATEGORY_ERRORS: Record<ops.CreateCategoryError, string> = {
  empty: 'Ponele un nombre a la categoría',
  duplicate: 'Ya tenés una categoría con ese nombre',
  limit: 'Llegaste al máximo de categorías propias',
};

const NOT_A_BACKUP = 'Ese archivo no es un backup de Gastito';
const UNDO = 'Deshacer';
/** El cartel de calificación aparece cuando la hoja ya terminó de cerrarse */
const REVIEW_DELAY_MS = 1200;

const monthTotal = (data: AppData, month: MonthKey) => sumOf(expensesInMonth(data, month));

/**
 * Las acciones de la app: combinan la operación de dominio, el cambio de estado, la vibración y el
 * aviso que ve la persona. Las pantallas solo llaman a estas funciones.
 */
export function useAppActions() {
  const { data, ui } = useAppState();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const categories = useCategories();
  const { prefs, update: updatePrefs } = usePreferences();
  const usage = prefs.usage;

  return useMemo(() => {
    const commit = (next: AppData, options: CommitOptions = {}) =>
      dispatch({ type: 'dataChanged', data: next, ...options });
    /** Para deshacer: se aplica sobre los datos que haya en ese momento, no sobre los de ahora */
    const later = (update: (current: AppData) => AppData) => dispatch({ type: 'dataUpdated', update, animate: true });

    const afterExpenseCreated = () => {
      const next = { ...usage, expensesCreated: usage.expensesCreated + 1 };
      const ask = shouldAskForReview(next);
      updatePrefs((p) => ({
        ...p,
        usage: {
          ...p.usage,
          expensesCreated: p.usage.expensesCreated + 1,
          ...(ask && { reviewRequestedAt: Date.now() }),
        },
      }));
      if (ask) setTimeout(() => void requestReview(), REVIEW_DELAY_MS);
    };

    const applyFixedIn = (month: MonthKey) => {
      const { data: next, count } = ops.applyPendingFixed(data, month);
      if (!count) return;
      commit(next, { animate: true });
      haptics.success();
      toast(`${count} ${count === 1 ? 'gasto fijo registrado' : 'gastos fijos registrados'}`);
    };

    return {
      setView: (view: ViewId, month?: MonthKey) => dispatch({ type: 'viewChanged', view, month }),
      shiftMonth: (delta: number) => dispatch({ type: 'monthChanged', month: shiftMonth(ui.month, delta) }),
      goToMonth: (month: MonthKey) => dispatch({ type: 'monthChanged', month }),
      toggleSelection: (id: string) => dispatch({ type: 'selectionToggled', id }),
      setFilter: (filter: string) => dispatch({ type: 'filterChanged', filter }),
      setQuery: (query: string) => dispatch({ type: 'queryChanged', query }),

      saveExpense(draft: ops.ExpenseDraft, editingId: string | null) {
        const result = ops.saveExpense(data, draft, editingId);
        const month = monthOf(result.expense.date);
        commit(result.data, { animate: true, ui: { month, selected: null } });

        const alert = budgetAlert(monthTotal(data, month), monthTotal(result.data, month), data.settings.budget);
        if (alert) {
          haptics.warning();
          toast(
            alert.level === 'over'
              ? `Te pasaste del presupuesto de ${monthName(month)} por ${money(-alert.left)}`
              : `Llegaste al 80% del presupuesto de ${monthName(month)}. Te quedan ${money(alert.left)}`,
          );
        } else {
          haptics.success();
          toast(
            result.created
              ? impactMessage(result.data, result.expense, categories.get(result.expense.categoryId))
              : 'Gasto actualizado',
          );
        }
        if (result.created) afterExpenseCreated();
      },

      deleteExpense(id: string) {
        const removed = data.expenses.find((e) => e.id === id);
        if (!removed) return;
        commit(ops.deleteExpense(data, id), { animate: true });
        haptics.light();
        toast('Gasto eliminado', {
          action: { label: UNDO, onPress: () => later((current) => ops.restoreExpense(current, removed)) },
        });
      },

      /** Anota de nuevo el mismo gasto, con fecha de hoy */
      duplicateExpense(id: string) {
        const source = data.expenses.find((e) => e.id === id);
        if (!source) return;
        const { data: next, expense } = ops.duplicateExpense(data, source, today());
        commit(next, { animate: true });
        haptics.success();
        toast(`Anotado otra vez hoy: ${money(expense.amount)}`, {
          action: { label: UNDO, onPress: () => later((current) => ops.deleteExpense(current, expense.id)) },
        });
        afterExpenseCreated();
      },

      /** Registra los fijos vencidos del mes que se está mirando */
      applyFixed: () => applyFixedIn(ui.month),
      /** Registra los fijos vencidos de un mes (por ejemplo, desde una notificación) */
      applyFixedIn,

      toggleFixed(id: string) {
        const rule = data.recurring.find((r) => r.id === id);
        if (!rule) return;
        commit(ops.toggleFixed(data, id));
        haptics.light();
        const name = rule.note || categories.get(rule.categoryId).name;
        toast(rule.active === false ? `${name} activo otra vez` : `${name} en pausa: no se va a sumar ni avisar`);
      },

      deleteFixed(id: string) {
        const rule = data.recurring.find((r) => r.id === id);
        if (!rule) return;
        const linked = data.expenses.filter((e) => e.recurringId === id).map((e) => e.id);
        commit(ops.deleteFixed(data, id));
        haptics.light();
        toast('Gasto fijo eliminado', {
          action: { label: UNDO, onPress: () => later((current) => ops.restoreFixed(current, rule, linked)) },
        });
      },

      saveBudget(budget: number | null) {
        if (budget === data.settings.budget) return;
        commit(ops.setBudget(data, budget));
        haptics.success();
        toast(budget ? `Presupuesto de ${money(budget)} por mes` : 'Presupuesto sacado');
      },

      /** Devuelve la categoría creada, o null si no se pudo (y avisa por qué). */
      createCategory(input: { name: string; emoji: string; color: string }): Category | null {
        const result = ops.createCategory(data, input);
        if (!result.ok) {
          haptics.error();
          toast(CATEGORY_ERRORS[result.reason]);
          return null;
        }
        commit(result.data);
        haptics.success();
        toast(`Categoría ${result.category.emoji} ${result.category.name} creada`);
        return result.category;
      },

      deleteCategory(id: string) {
        commit(ops.deleteCategory(data, id), {
          animate: true,
          ui: { filter: ui.filter === id ? ALL_FILTER : ui.filter, selected: ui.selected === id ? null : ui.selected },
        });
        haptics.light();
        toast('Categoría borrada');
      },

      loadDemo() {
        commit(buildDemoData(data.categories), { animate: true, ui: { month: currentMonth() } });
        haptics.success();
        toast('Datos de ejemplo cargados. Podés borrarlos desde Ajustes.');
      },

      wipeAll() {
        const snapshot = data;
        commit(ops.emptyData(), { animate: true, ui: { month: currentMonth(), filter: ALL_FILTER, selected: null } });
        haptics.warning();
        toast('Listo, arrancás de cero', {
          // solo si no se cargó nada nuevo mientras tanto (no se pisa lo nuevo)
          action: { label: UNDO, onPress: () => later((current) => (ops.isEmptyData(current) ? snapshot : current)) },
        });
      },

      /** Reemplaza todo con un backup. Devuelve true si se importó. */
      importBackup(json: unknown): boolean {
        const clean = sanitizeData(json);
        if (!clean) {
          haptics.error();
          toast(NOT_A_BACKUP);
          return false;
        }
        const { data: next, skipped } = clean;
        // si traía cosas y no se salvó ninguna, no es un backup: no se pisa lo que hay
        if (skipped && ops.isEmptyData(next)) {
          haptics.error();
          toast(NOT_A_BACKUP);
          return false;
        }
        const snapshot = data;
        commit(next, { animate: true, ui: { filter: ALL_FILTER, selected: null } });
        haptics.success();
        toast(
          skipped
            ? `Datos importados. Se ${skipped === 1 ? 'omitió 1 registro' : `omitieron ${skipped} registros`} con formato inválido.`
            : 'Datos importados',
          { action: { label: UNDO, onPress: () => later((current) => (current === next ? snapshot : current)) } },
        );
        return true;
      },
    };
  }, [data, ui.month, ui.filter, ui.selected, dispatch, toast, categories, usage, updatePrefs]);
}

export type AppActions = ReturnType<typeof useAppActions>;
