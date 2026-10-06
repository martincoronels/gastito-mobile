import { useMemo, type ComponentProps } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGridColumns } from '@/components/ui/grid';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Tile } from '@/components/ui/Tile';
import { buildSlices } from '@/domain/donut';
import { averageOf, lastMonths, monthSummary, unregisteredFixed } from '@/domain/selectors';
import type { AppData } from '@/domain/types';
import { monthName, shiftMonth } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { money } from '@/lib/money';
import { plural } from '@/lib/text';
import { useAppState } from '@/state/AppStateProvider';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { useCategories } from '@/state/useCategories';
import { makeStyles } from '@/theme';
import { MonthBar } from '../shared/MonthBar';
import { MonthSwipe } from '../shared/MonthSwipe';
import { PendingBanner } from '../shared/PendingBanner';
import { BudgetCard } from './BudgetCard';
import { CategoryList } from './CategoryList';
import { Donut, type DonutCenter } from './Donut';
import { TrendChart } from './TrendChart';

type TileProps = Omit<ComponentProps<typeof Tile>, 'width'>;

const fixedRules = (data: AppData) => data.recurring.some((r) => r.active !== false);

/** Resumen del mes: la dona, los indicadores, el presupuesto, las categorías y la tendencia. */
export function SummaryView() {
  const styles = useStyles();
  const { data, ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const categories = useCategories();
  const { columns, itemWidth } = useGridColumns(150, 10);

  const summary = useMemo(() => monthSummary(data, ui.month), [data, ui.month]);
  const slices = useMemo(() => buildSlices(summary.categories, summary.sum, categories.get), [summary, categories]);
  const trend = useMemo(() => lastMonths(data, ui.month), [data, ui.month]);

  if (!summary.expenses.length && !summary.pending.length) {
    const hasAny = data.expenses.length > 0;
    return (
      <View>
        <MonthSwipe>
          <MonthBar />
        </MonthSwipe>
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

  const { sum, categories: totals } = summary;
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
  const budget = data.settings.budget;
  const previousName = monthName(shiftMonth(ui.month, -1));
  const { change } = summary;
  const select = (id: string) => {
    haptics.selection();
    actions.toggleSelection(id);
  };

  const tiles: TileProps[] = [
    {
      label: 'Promedio por día',
      value: money(summary.perDay),
      note: summary.isCurrent ? `sobre ${summary.elapsedDays} días de este mes` : `sobre ${summary.daysInMonth} días`,
    },
  ];
  if (summary.isCurrent) {
    tiles.push({
      label: 'Cierre estimado',
      value: money(summary.projection),
      note: summary.upcomingFixed || fixedRules(data) ? 'con tus fijos y a este ritmo' : 'si seguís a este ritmo',
    });
  }
  tiles.push({
    label: `Contra ${previousName}`,
    value: change === null ? '—' : `${change >= 0 ? '+' : ''}${Math.round(change)}%`,
    note: summary.isCurrent
      ? summary.previousComparable
        ? `${money(summary.previousComparable)} a esta altura de ${previousName}`
        : `sin gastos a esta altura de ${previousName}`
      : summary.previousSum
        ? `${money(summary.previousSum)} en ${previousName}`
        : 'sin datos del mes anterior',
    tone: change === null || Math.round(change) === 0 ? undefined : change > 0 ? 'up' : 'down',
  });
  if (summary.isCurrent && summary.upcomingFixed > 0) {
    const count = unregisteredFixed(data, ui.month).length;
    tiles.push({
      label: 'Fijos por venir',
      value: money(summary.upcomingFixed),
      note: `${plural(count, 'gasto fijo', 'gastos fijos')} sin registrar`,
    });
  }
  // si queda uno solo en la última fila, ocupa todo el ancho
  const lastSpans = columns > 1 && tiles.length % columns === 1;

  return (
    <View>
      <MonthSwipe>
        <MonthBar />
        <View style={styles.hero}>
          <Donut
            slices={slices}
            sum={sum}
            selected={ui.selected}
            animationKey={ui.donutKey}
            center={center}
            onSelect={select}
          />
          {top ? (
            <AppText style={styles.heroLine}>
              Lo que más pesa es{' '}
              <AppText style={styles.heroStrong}>{categories.get(top.id).name.toLowerCase()}</AppText>: {money(top.sum)}
              , el {Math.round((top.sum / sum) * 100)}% del mes.
            </AppText>
          ) : null}
        </View>
      </MonthSwipe>

      {summary.pending.length ? (
        <PendingBanner rules={summary.pending} month={ui.month} onApply={actions.applyFixed} />
      ) : null}

      <View style={[styles.section, styles.tiles]}>
        {tiles.map((tile, i) => (
          <Tile
            key={tile.label}
            {...tile}
            width={lastSpans && i === tiles.length - 1 ? itemWidth * columns + 10 * (columns - 1) : itemWidth}
          />
        ))}
      </View>

      {budget ? (
        <View style={styles.section}>
          <BudgetCard
            spent={sum}
            budget={budget}
            upcomingFixed={summary.upcomingFixed}
            daysLeft={summary.isCurrent ? Math.max(summary.daysInMonth - summary.elapsedDays, 0) : 0}
          />
        </View>
      ) : null}

      <View style={styles.categories}>
        <SectionHeader title="Categorías" side={`${totals.length} en juego`} />
        <CategoryList totals={totals} sum={sum} slices={slices} selected={ui.selected} onToggle={select} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Últimos 6 meses" side={`promedio ${money(averageOf(trend))}`} />
        <TrendChart
          months={trend}
          selected={ui.month}
          onSelect={(month) => {
            if (month !== ui.month) haptics.selection();
            actions.goToMonth(month);
          }}
        />
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
