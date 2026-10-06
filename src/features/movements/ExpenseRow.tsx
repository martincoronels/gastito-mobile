import { Pressable, View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { CategoryChip } from '@/components/CategoryChip';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { SWIPE_COLORS, SwipeRow } from '@/components/ui/SwipeRow';
import type { Category, Expense } from '@/domain/types';
import { money } from '@/lib/money';
import { fonts, makeStyles, useTheme } from '@/theme';

interface ExpenseRowProps {
  expense: Expense;
  category: Category;
  first: boolean;
  onPress: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSwipeOpen?: (methods: SwipeableMethods) => void;
}

/**
 * Un gasto de la lista. Tocarlo lo abre para editar; deslizarlo a la izquierda lo elimina y a la
 * derecha lo anota otra vez con fecha de hoy (las dos cosas se pueden deshacer).
 */
export function ExpenseRow({ expense, category, first, onPress, onDelete, onDuplicate, onSwipeOpen }: ExpenseRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const title = expense.note || category.name;
  const meta = [expense.note ? category.name : '', expense.method].filter(Boolean).join(' · ');
  const spoken = [title, money(expense.amount), meta, expense.recurringId ? 'gasto fijo' : ''].filter(Boolean);
  return (
    <SwipeRow
      onOpen={onSwipeOpen}
      leftActions={[{ label: 'Otra vez', icon: 'repeat', color: SWIPE_COLORS.green, onPress: onDuplicate }]}
      rightActions={[{ label: 'Eliminar', icon: 'trash', color: SWIPE_COLORS.red, onPress: onDelete }]}
    >
      {(guard) => (
        <Pressable
          onPress={guard(onPress)}
          accessibilityRole="button"
          accessibilityLabel={spoken.join(', ')}
          accessibilityHint="Abre el gasto para editarlo"
          accessibilityActions={[
            { name: 'duplicate', label: 'Anotar otra vez hoy' },
            { name: 'delete', label: 'Eliminar' },
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'delete') onDelete();
            if (e.nativeEvent.actionName === 'duplicate') onDuplicate();
          }}
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
      )}
    </SwipeRow>
  );
}

const useStyles = makeStyles((c) => ({
  // fondo opaco: las acciones esperan debajo de la fila
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: c.surface,
  },
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
