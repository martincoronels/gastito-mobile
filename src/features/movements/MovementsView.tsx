import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ALL_FILTER } from '@/domain/catalog';
import { expensesInMonth, filterMovements, groupByDay, sumOf, totalsByCategory } from '@/domain/selectors';
import { dayLabel, monthName } from '@/lib/dates';
import { money } from '@/lib/money';
import { plural } from '@/lib/text';
import { useAppState } from '@/state/AppStateProvider';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { useCategories } from '@/state/useCategories';
import { makeStyles, radius } from '@/theme';
import { MonthBar } from '../shared/MonthBar';
import { MonthSwipe } from '../shared/MonthSwipe';
import { CategoryFilter } from './CategoryFilter';
import { ExpenseRow } from './ExpenseRow';
import { SearchField } from './SearchField';

/** Todos los gastos del mes, agrupados por día, con búsqueda y filtro por categoría. */
export function MovementsView() {
  const styles = useStyles();
  const { data, ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const categories = useCategories();

  const inMonth = useMemo(() => expensesInMonth(data, ui.month), [data, ui.month]);
  const chips = useMemo(() => {
    const list = totalsByCategory(inMonth).map((t) => categories.get(t.id));
    // la categoría filtrada siempre tiene su chip, aunque en este mes no tenga gastos
    // (si no, el filtro quedaba puesto pero invisible y la lista, vacía sin explicación)
    if (ui.filter !== ALL_FILTER && !list.some((c) => c.id === ui.filter)) list.unshift(categories.get(ui.filter));
    return list;
  }, [inMonth, categories, ui.filter]);
  const results = useMemo(
    () => filterMovements(inMonth, ui.filter, ui.query, (id) => categories.get(id).name),
    [inMonth, ui.filter, ui.query, categories],
  );
  const groups = useMemo(() => groupByDay(results), [results]);
  const filtering = ui.query.trim() !== '' || ui.filter !== ALL_FILTER;

  // una sola fila abierta a la vez, como en Mail
  const openRow = useRef<SwipeableMethods | null>(null);
  const onSwipeOpen = useCallback((row: SwipeableMethods) => {
    if (openRow.current && openRow.current !== row) openRow.current.close();
    openRow.current = row;
  }, []);

  return (
    <View>
      <MonthSwipe>
        <MonthBar />
      </MonthSwipe>
      <View style={styles.section}>
        <SearchField value={ui.query} onChange={actions.setQuery} />
        <CategoryFilter categories={chips} selected={ui.filter} onSelect={actions.setFilter} />
        <SectionHeader title={plural(results.length, 'movimiento', 'movimientos')} side={money(sumOf(results))} />
        {groups.length ? (
          groups.map((group) => (
            <View key={group.date} style={styles.day}>
              <View style={styles.dayHead}>
                <AppText style={styles.dayLabel} accessibilityRole="header">
                  {dayLabel(group.date)}
                </AppText>
                <AppText style={styles.dayTotal}>{money(group.total)}</AppText>
              </View>
              <View style={styles.list}>
                {group.items.map((expense, i) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    category={categories.get(expense.categoryId)}
                    first={i === 0}
                    onPress={() => sheet.openExpense(expense.id)}
                    onDelete={() => actions.deleteExpense(expense.id)}
                    onDuplicate={() => actions.duplicateExpense(expense.id)}
                    onSwipeOpen={onSwipeOpen}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            title="No hay nada acá"
            text={
              filtering
                ? 'Probá sacando el filtro o buscando otra cosa.'
                : `Anotá tu primer gasto de ${monthName(ui.month)}.`
            }
          >
            <Button label="Anotar gasto" onPress={() => sheet.openExpense()} />
          </EmptyState>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { marginTop: 14 },
  day: { marginBottom: 18 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4, paddingBottom: 7 },
  dayLabel: { fontSize: 13, lineHeight: 18.85, fontWeight: '600' },
  dayTotal: { marginLeft: 'auto', fontSize: 13, color: c.ink3, fontVariant: ['tabular-nums'] },
  list: { backgroundColor: c.surface, borderRadius: radius.md, overflow: 'hidden' },
}));
