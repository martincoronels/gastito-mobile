import { Pressable, View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { Category, Expense } from '@/domain/types';
import { money } from '@/lib/money';
import { fonts, makeStyles, useTheme } from '@/theme';

interface ExpenseRowProps {
  expense: Expense;
  category: Category;
  first: boolean;
  onPress: () => void;
}

export function ExpenseRow({ expense, category, first, onPress }: ExpenseRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const title = expense.note || category.name;
  const meta = [expense.note ? category.name : '', expense.method].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${money(expense.amount)}`}
      accessibilityHint="Abre el gasto para editarlo"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {first ? null : <View style={styles.divider} />}
      <View style={styles.chipColumn}>
        <CategoryChip category={category} size={30} />
      </View>
      <View style={styles.texts}>
        <AppText style={styles.title}>{title}</AppText>
        {meta || expense.recurringId ? (
          <View style={styles.metaRow}>
            {meta ? <AppText style={styles.meta}>{meta}</AppText> : null}
            {expense.recurringId ? (
              <View style={styles.tag}>
                <Icon name="repeat" size={11} color={colors.ink2} />
                <AppText style={styles.tagText}>fijo</AppText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <AppText style={styles.amount}>{money(expense.amount)}</AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  pressed: { backgroundColor: c.soft },
  divider: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: c.lineSoft },
  chipColumn: { width: 34 },
  texts: { flex: 1 },
  title: { fontSize: 14.5, lineHeight: 18.85, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 5, rowGap: 2 },
  meta: { fontSize: 12.5, lineHeight: 18.1, color: c.ink3, flexShrink: 1 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.lineSoft,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tagText: { fontSize: 11.5, lineHeight: 16.7, color: c.ink2 },
  amount: { fontFamily: fonts.display, fontSize: 15, fontVariant: ['tabular-nums'] },
}));
