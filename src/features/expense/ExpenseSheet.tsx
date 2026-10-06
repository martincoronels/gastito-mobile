import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { useToast } from '@/components/feedback/ToastProvider';
import { useRevealInSheet } from '@/components/sheet/BottomSheet';
import { Button } from '@/components/ui/Button';
import { FieldLabel } from '@/components/ui/FieldLabel';
import { TextField } from '@/components/ui/TextField';
import {
  ALL_FILTER,
  DEFAULT_CATEGORY_ID,
  DEFAULT_PAYMENT_METHOD,
  MAX_NOTE_LENGTH,
  isPaymentMethod,
} from '@/domain/catalog';
import type { ExpensePrefill } from '@/domain/links';
import type { Expense, PaymentMethod } from '@/domain/types';
import { currentMonth, today, type DateKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { amountToInput, parseAmount } from '@/lib/money';
import { useAppState } from '@/state/AppStateProvider';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { useCategories } from '@/state/useCategories';
import { AmountField } from './AmountField';
import { CategoryPicker } from './CategoryPicker';
import { DateField, InlineCalendar } from './DateField';
import { MethodField, MethodOptions } from './MethodField';
import { NewCategoryForm } from './NewCategoryForm';
import { RepeatToggle } from './RepeatToggle';

/** Formulario para anotar un gasto nuevo o editar uno existente. */
export function ExpenseSheet({ expense, prefill }: { expense: Expense | null; prefill?: ExpensePrefill }) {
  const { ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const toast = useToast();
  const categories = useCategories();
  const reveal = useRevealInSheet();

  const [amount, setAmount] = useState(() =>
    expense ? amountToInput(expense.amount) : prefill?.amount ? amountToInput(prefill.amount) : '',
  );
  const [categoryId, setCategoryId] = useState(
    () =>
      expense?.categoryId ??
      prefill?.categoryId ??
      (ui.filter !== ALL_FILTER && categories.all.some((c) => c.id === ui.filter) ? ui.filter : DEFAULT_CATEGORY_ID),
  );
  const [note, setNote] = useState(expense?.note ?? prefill?.note ?? '');
  const [date, setDate] = useState<DateKey>(
    () => expense?.date ?? (ui.month === currentMonth() ? today() : `${ui.month}-01`),
  );
  const [method, setMethod] = useState<PaymentMethod>(
    expense && isPaymentMethod(expense.method) ? expense.method : DEFAULT_PAYMENT_METHOD,
  );
  const [repeat, setRepeat] = useState(Boolean(expense?.recurringId));
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [panel, setPanel] = useState<'date' | 'method' | null>(null);

  const amountInput = useRef<TextInput>(null);
  const noteInput = useRef<TextInput>(null);

  // como en la web: al abrir, el foco va al monto (gasto nuevo) o al detalle (editar)
  useEffect(() => {
    const target = expense ? noteInput : amountInput;
    const timer = setTimeout(() => target.current?.focus(), 260);
    return () => clearTimeout(timer);
  }, [expense]);

  const save = () => {
    const value = parseAmount(amount);
    if (!(value > 0)) {
      haptics.error();
      amountInput.current?.focus();
      toast('Poné un monto mayor a cero');
      return;
    }
    actions.saveExpense({ amount: value, categoryId, note: note.trim(), date, method, repeat }, expense?.id ?? null);
    sheet.close();
  };

  const remove = () => {
    if (!expense) return;
    actions.deleteExpense(expense.id);
    sheet.close();
  };

  const togglePanel = (next: 'date' | 'method') => setPanel((current) => (current === next ? null : next));

  return (
    <View>
      <AmountField ref={amountInput} value={amount} onChange={setAmount} />

      <FieldLabel>Categoría</FieldLabel>
      <CategoryPicker
        categories={categories.all}
        selected={categoryId}
        onSelect={setCategoryId}
        onCreate={() => setCreatingCategory(true)}
      />
      {creatingCategory ? (
        <NewCategoryForm
          onCancel={() => setCreatingCategory(false)}
          onCreated={(category) => {
            setCategoryId(category.id);
            setCreatingCategory(false);
          }}
        />
      ) : null}

      <View style={styles.field}>
        <FieldLabel>En qué (opcional)</FieldLabel>
        <TextField
          ref={noteInput}
          value={note}
          onChangeText={setNote}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Ej: PedidosYa con Vicky"
          returnKeyType="done"
          onSubmitEditing={save}
          onFocus={() => {
            setPanel(null);
            reveal(noteInput.current);
          }}
        />
      </View>

      <View style={styles.two}>
        <View style={styles.half}>
          <FieldLabel>Fecha</FieldLabel>
          <DateField value={date} open={panel === 'date'} onToggle={() => togglePanel('date')} onChange={setDate} />
        </View>
        <View style={styles.half}>
          <FieldLabel>Medio de pago</FieldLabel>
          <MethodField
            value={method}
            listOpen={panel === 'method'}
            onChange={setMethod}
            onToggleList={() => togglePanel('method')}
          />
        </View>
      </View>
      {panel === 'date' ? (
        <InlineCalendar
          value={date}
          onChange={(next) => {
            setDate(next);
            setPanel(null);
          }}
        />
      ) : null}
      {panel === 'method' ? (
        <MethodOptions
          value={method}
          onChange={(next) => {
            setMethod(next);
            setPanel(null);
          }}
        />
      ) : null}

      <RepeatToggle value={repeat} onChange={setRepeat} />

      <View style={styles.actions}>
        {expense ? <Button variant="danger" label="Eliminar" onPress={remove} style={styles.action} /> : null}
        <Button label={expense ? 'Guardar cambios' : 'Anotar gasto'} onPress={save} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 15 },
  two: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  half: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 2 },
  action: { flex: 1 },
});
