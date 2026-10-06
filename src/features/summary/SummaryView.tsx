import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGridColumns } from '@/components/ui/grid';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tile } from '@/components/ui/Tile';
import { buildSlices } from '@/domain/donut';
import { lastMonths, monthSummary } from '@/domain/selectors';
import { monthName, shiftMonth } from '@/lib/dates';
import { money } from '@/lib/money';
import { plural } from '@/lib/text';
import { useAppState } from '@/state/AppStateProvider';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { useCategories } from '@/state/useCategories';
import { makeStyles } from '@/theme';
import { MonthBar } from '../shared/MonthBar';
import { PendingBanner } from '../shared/PendingBanner';
import { BudgetCard } from './BudgetCard';
import { CategoryList } from './CategoryList';
import { Donut, type DonutCenter } from './Donut';
import { TrendChart } from './TrendChart';

/** Resumen del mes: la dona, los indicadores, el presupuesto, las categorías y la tendencia. */
export function SummaryView() {
  const styles = useStyles();
  const { data, ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const categories = useCategories();
  const { itemWidth } = useGridColumns(150, 10);

  const summary = useMemo(() => monthSummary(data, ui.month), [data, ui.month]);
  const slices = useMemo(() => buildSlices(summary.categories, summary.sum, categories.get), [summary, categories]);
  const trend = useMemo(() => lastMonths(data, ui.month), [data, ui.month]);

  if (!summary.expenses.length && !summary.pending.length) {
    const hasAny = data.expenses.length > 0;
    return (
      <View>
        <MonthBar />
        <View style={styles.section}>
          <EmptyState
            title={hasAny ? `Sin gastos en ${monthName(ui.month)}` : 'Empecemos por el primero'}
            text={
              hasAny
                ? 'Cambiá de mes o anotá un gasto de este mes.'
                : 'Anotá un gasto y Gastito arma el reporte solo: totales, categorías y comparación con el mes anterior.'
            }
          >
            <Button label="Anotar gasto" onPress={() => sheet.openExpense()} />
            {hasAny ? null : <Button variant="ghost" label="Ver un mes de ejemplo" onPress={actions.loadDemo} />}
          </EmptyState>
        </View>
      </View>
    );
  }

  const { sum, categories: totals, previousSum } = summary;
  // en el centro de la dona: el mes entero o la categoría elegida
  const pickedSlice = ui.selected ? slices.find((s) => s.id === ui.selected) : undefined;
  const pickedTotal = ui.selected && !pickedSlice ? totals.find((t) => t.id === ui.selected) : undefined;
  const picked = pickedSlice ?? pickedTotal;
  const center: DonutCenter = picked
    ? {
        caption: pickedSlice ? pickedSlice.category.name : categories.get(picked.id).name,
        amount: picked.sum,
        sub: `${Math.round((picked.sum / sum) * 100)}% · ${plural(picked.n, 'gasto', 'gastos')}`,
      }
    : { caption: 'Gastaste', amount: sum, sub: plural(summary.expenses.length, 'movimiento', 'movimientos') };

  const top = totals[0];
  const diff = previousSum ? ((sum - previousSum) / previousSum) * 100 : null;
  const budget = data.settings.budget;

  return (
    <View>
      <MonthBar />
      <View style={styles.hero}>
        <Donut
          slices={slices}
          sum={sum}
          selected={ui.selected}
          animationKey={ui.donutKey}
          center={center}
          onSelect={actions.toggleSelection}
        />
        {top ? (
          <AppText style={styles.heroLine}>
            Lo que más pesa es <AppText style={styles.heroStrong}>{categories.get(top.id).name.toLowerCase()}</AppText>:{' '}
            {money(top.sum)}, el {Math.round((top.sum / sum) * 100)}% del mes.
          </AppText>
        ) : null}
      </View>

      {summary.pending.length ? (
        <PendingBanner rules={summary.pending} month={ui.month} onApply={actions.applyFixed} />
      ) : null}

      <View style={[styles.section, styles.tiles]}>
        <Tile
          width={itemWidth}
          label="Promedio por día"
          value={money(summary.perDay)}
          note={
            summary.isCurrent ? `sobre ${summary.elapsedDays} días de este mes` : `sobre ${summary.daysInMonth} días`
          }
        />
        {summary.isCurrent ? (
          <Tile
            width={itemWidth}
            label="Cierre estimado"
            value={money(summary.perDay * summary.daysInMonth)}
            note="si seguís a este ritmo"
          />
        ) : null}
        <Tile
          width={itemWidth}
          label={`Contra ${monthName(shiftMonth(ui.month, -1))}`}
          value={diff === null ? '—' : `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`}
          note={previousSum ? `${money(previousSum)} el mes pasado` : 'sin datos del mes anterior'}
          tone={diff === null || diff === 0 ? undefined : diff > 0 ? 'up' : 'down'}
        />
      </View>

      {budget ? (
        <View style={styles.section}>
          <BudgetCard
            spent={sum}
            budget={budget}
            daysLeft={summary.isCurrent ? Math.max(summary.daysInMonth - summary.elapsedDays, 0) : 0}
          />
        </View>
      ) : null}

      <View style={styles.categories}>
        <SectionHeader title="Categorías" side={`${totals.length} en juego`} />
        <CategoryList
          totals={totals}
          sum={sum}
          slices={slices}
          selected={ui.selected}
          onToggle={actions.toggleSelection}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Últimos 6 meses" side={`promedio ${money(trend.reduce((a, m) => a + m.sum, 0) / 6)}`} />
        <TrendChart months={trend} selected={ui.month} onSelect={actions.goToMonth} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 10 },
  heroLine: { marginTop: 2, fontSize: 14.5, lineHeight: 21, color: c.ink2, textAlign: 'center', maxWidth: 300 },
  heroStrong: { color: c.ink, fontWeight: '600' },
  section: { marginTop: 26 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categories: { marginTop: 30 },
}));
