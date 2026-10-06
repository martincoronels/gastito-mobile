import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { monthAbbr, monthTitle, type MonthKey } from '@/lib/dates';
import { money } from '@/lib/money';
import { colors, radius } from '@/theme';

interface TrendChartProps {
  months: { month: MonthKey; sum: number }[];
  selected: MonthKey;
  onSelect: (month: MonthKey) => void;
}

/** Barras de los últimos 6 meses. Tocar una lleva a ese mes. */
export function TrendChart({ months, selected, onSelect }: TrendChartProps) {
  const max = Math.max(...months.map((m) => m.sum), 1);
  return (
    <View style={styles.card}>
      {months.map(({ month, sum }) => {
        const current = month === selected;
        return (
          <Pressable
            key={month}
            style={styles.column}
            onPress={() => onSelect(month)}
            accessibilityRole="button"
            accessibilityLabel={`${monthTitle(month)}: ${money(sum)}`}
          >
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max((sum / max) * 100, 3)}%`,
                    backgroundColor: current ? colors.ink : colors.trendIdle,
                  },
                ]}
              />
            </View>
            <AppText style={[styles.label, current && styles.labelCurrent]}>{monthAbbr(month)}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 12,
    height: 150,
    flexDirection: 'row',
    gap: 8,
  },
  column: { flex: 1, alignItems: 'center', gap: 7 },
  track: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', maxWidth: 34, borderRadius: 7 },
  label: { fontSize: 11.5, lineHeight: 16.7, color: colors.ink3 },
  labelCurrent: { color: colors.ink, fontWeight: '600' },
});
