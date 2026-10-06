import { View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { isCategoryHighlighted, type DonutSlice } from '@/domain/donut';
import type { CategoryTotal } from '@/domain/selectors';
import { money } from '@/lib/money';
import { plural } from '@/lib/text';
import { useCategories } from '@/state/useCategories';
import { fonts, makeStyles, radius } from '@/theme';

interface CategoryListProps {
  totals: CategoryTotal[];
  sum: number;
  slices: DonutSlice[];
  selected: string | null;
  onToggle: (id: string) => void;
}

export function CategoryList({ totals, sum, slices, selected, onToggle }: CategoryListProps) {
  const styles = useStyles();
  const categories = useCategories();
  return (
    <View style={styles.card}>
      {totals.map((total) => {
        const category = categories.get(total.id);
        const on = isCategoryHighlighted(total.id, selected, slices);
        const pct = Math.round((total.sum / sum) * 100);
        return (
          <PressableScale
            key={total.id}
            scaleTo={0.985}
            onPress={() => onToggle(total.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${category.name}, ${money(total.sum)}, ${pct}%`}
            style={[styles.row, on && styles.rowOn]}
            pressedStyle={!on && styles.rowPressed}
          >
            <CategoryChip category={category} size={36} />
            <View style={styles.texts}>
              <AppText style={styles.name}>{category.name}</AppText>
              <AppText style={styles.meta}>{plural(total.n, 'gasto', 'gastos')}</AppText>
            </View>
            <View style={styles.numbers}>
              <AppText style={styles.amount}>{money(total.sum)}</AppText>
              <AppText style={styles.meta}>{pct}%</AppText>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: radius.md, padding: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowOn: { backgroundColor: c.softer },
  rowPressed: { backgroundColor: c.soft },
  texts: { flex: 1 },
  name: { fontSize: 14.5, lineHeight: 18.1, fontWeight: '500' },
  meta: { fontSize: 12.5, lineHeight: 15, color: c.ink3, marginTop: 3 },
  numbers: { alignItems: 'flex-end' },
  amount: { fontFamily: fonts.display, fontSize: 15, lineHeight: 18.75, fontVariant: ['tabular-nums'] },
}));
