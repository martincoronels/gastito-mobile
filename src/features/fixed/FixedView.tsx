import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGridColumns } from '@/components/ui/grid';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tile } from '@/components/ui/Tile';
import { expensesInMonth, fixedTotalIn, pendingFixed, sumOf } from '@/domain/selectors';
import { monthName } from '@/lib/dates';
import { money } from '@/lib/money';
import { useAppState } from '@/state/AppStateProvider';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { useCategories } from '@/state/useCategories';
import { makeStyles, radius } from '@/theme';
import { PendingBanner } from '../shared/PendingBanner';
import { FixedRow } from './FixedRow';

/** Los gastos que se repiten todos los meses: cuánto pesan y cuáles faltan registrar. */
export function FixedView() {
  const styles = useStyles();
  const { data, ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const categories = useCategories();
  const { itemWidth } = useGridColumns(150, 10);

  const rules = useMemo(() => [...data.recurring].sort((a, b) => b.amount - a.amount), [data.recurring]);
  const pending = useMemo(() => pendingFixed(data, ui.month), [data, ui.month]);
  const active = rules.filter((r) => r.active !== false);
  const perMonth = sumOf(active);
  const monthTotal = sumOf(expensesInMonth(data, ui.month));
  const fixedInMonth = fixedTotalIn(data, ui.month);

  // una sola fila abierta a la vez
  const openRow = useRef<SwipeableMethods | null>(null);
  const onSwipeOpen = useCallback((row: SwipeableMethods) => {
    if (openRow.current && openRow.current !== row) openRow.current.close();
    openRow.current = row;
  }, []);

  return (
    <View style={styles.section}>
      <SectionHeader title="Gastos fijos" side={`${active.length} activos`} />
      <View style={styles.tiles}>
        <Tile width={itemWidth} label="Por mes" value={money(perMonth)} note={`${money(perMonth * 12)} al año`} />
        <Tile
          width={itemWidth}
          label={`Peso en ${monthName(ui.month)}`}
          value={monthTotal ? `${Math.round((fixedInMonth / monthTotal) * 100)}%` : '—'}
          note={`${money(fixedInMonth)} registrados`}
        />
      </View>
      {rules.length ? (
        <View style={styles.list}>
          {rules.map((rule, i) => (
            <FixedRow
              key={rule.id}
              rule={rule}
              category={categories.get(rule.categoryId)}
              first={i === 0}
              due={pending.some((p) => p.id === rule.id)}
              onToggle={() => actions.toggleFixed(rule.id)}
              onDelete={() => actions.deleteFixed(rule.id)}
              onSwipeOpen={onSwipeOpen}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="Todavía no hay gastos fijos"
          text="Netflix, Claude, el alquiler, Mercado Pago. Marcá “se repite todos los meses” al anotar un gasto y aparece acá."
        >
          <Button label="Anotar gasto" onPress={() => sheet.openExpense()} />
        </EmptyState>
      )}
      {pending.length ? <PendingBanner rules={pending} month={ui.month} onApply={actions.applyFixed} /> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { marginTop: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  list: { backgroundColor: c.surface, borderRadius: radius.md, overflow: 'hidden' },
}));
