import { StyleSheet, View } from 'react-native';

import { CategoryChip } from '@/components/CategoryChip';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import type { Category, RecurringExpense } from '@/domain/types';
import { money } from '@/lib/money';
import { colors, fonts } from '@/theme';

interface FixedRowProps {
  rule: RecurringExpense;
  category: Category;
  first: boolean;
  /** Ya venció este mes y no se registró */
  due: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

/** Fila de gasto fijo: nombre y monto arriba; detalle y controles abajo. */
export function FixedRow({ rule, category, first, due, onToggle, onDelete }: FixedRowProps) {
  const off = rule.active === false;
  return (
    <View style={styles.row}>
      {first ? null : <View style={styles.divider} />}
      <View style={off && styles.off}>
        <CategoryChip category={category} size={30} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <AppText numberOfLines={1} style={[styles.name, off && styles.off]}>
            {rule.note || category.name}
          </AppText>
          <AppText style={[styles.amount, off && styles.off]}>{money(rule.amount)}</AppText>
        </View>
        <View style={styles.line}>
          <AppText numberOfLines={1} style={styles.detail}>
            {off ? (
              `En pausa · ${category.name}`
            ) : (
              <>
                Todos los {rule.day} · {due ? <AppText style={styles.due}>sin registrar</AppText> : category.name}
              </>
            )}
          </AppText>
          <View style={styles.actions}>
            <IconButton
              icon={off ? 'play' : 'pause'}
              size={30}
              iconSize={16}
              onPress={onToggle}
              accessibilityLabel={off ? 'Activar' : 'Pausar'}
            />
            <IconButton icon="trash" size={30} iconSize={16} onPress={onDelete} accessibilityLabel="Eliminar" />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  divider: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: colors.lineSoft },
  body: { flex: 1, gap: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, fontSize: 14.5, lineHeight: 18.85, fontWeight: '500' },
  amount: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19.5, fontVariant: ['tabular-nums'] },
  detail: { flex: 1, fontSize: 12.5, lineHeight: 16.9, color: colors.ink3 },
  due: { color: colors.warn, fontWeight: '500' },
  actions: { flexDirection: 'row', marginRight: -7, marginBottom: -3, marginLeft: -2 },
  off: { opacity: 0.45 },
});
