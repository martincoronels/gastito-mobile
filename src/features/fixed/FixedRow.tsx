import { View } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { CategoryChip } from '@/components/CategoryChip';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { SWIPE_COLORS, SwipeRow } from '@/components/ui/SwipeRow';
import type { Category, RecurringExpense } from '@/domain/types';
import { money } from '@/lib/money';
import { fonts, makeStyles } from '@/theme';

interface FixedRowProps {
  rule: RecurringExpense;
  category: Category;
  first: boolean;
  /** Ya venció este mes y no se registró */
  due: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSwipeOpen?: (methods: SwipeableMethods) => void;
}

/**
 * Fila de gasto fijo: nombre y monto arriba; detalle y controles abajo. También se puede deslizar:
 * a la derecha para pausar o activar, a la izquierda para eliminar.
 */
export function FixedRow({ rule, category, first, due, onToggle, onDelete, onSwipeOpen }: FixedRowProps) {
  const styles = useStyles();
  const off = rule.active === false;
  const name = rule.note || category.name;
  const status = off ? 'en pausa' : due ? `todos los ${rule.day}, sin registrar` : `todos los ${rule.day}`;
  return (
    <SwipeRow
      onOpen={onSwipeOpen}
      leftActions={[
        off
          ? { label: 'Activar', icon: 'play', color: SWIPE_COLORS.green, onPress: onToggle }
          : { label: 'Pausar', icon: 'pause', color: SWIPE_COLORS.orange, onPress: onToggle },
      ]}
      rightActions={[{ label: 'Eliminar', icon: 'trash', color: SWIPE_COLORS.red, onPress: onDelete }]}
    >
      <View style={styles.row}>
        {first ? null : <View style={styles.divider} />}
        <View
          style={styles.summary}
          accessible
          accessibilityLabel={`${name}, ${money(rule.amount)}, ${status}, ${category.name}`}
          accessibilityActions={[
            { name: 'toggle', label: off ? 'Activar' : 'Pausar' },
            { name: 'delete', label: 'Eliminar' },
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'toggle') onToggle();
            if (e.nativeEvent.actionName === 'delete') onDelete();
          }}
        >
          <View style={off && styles.off}>
            <CategoryChip category={category} size={30} />
          </View>
          <View style={styles.body}>
            <View style={styles.line}>
              <AppText numberOfLines={1} style={[styles.name, off && styles.off]}>
                {name}
              </AppText>
              <AppText style={[styles.amount, off && styles.off]}>{money(rule.amount)}</AppText>
            </View>
            <AppText numberOfLines={1} style={styles.detail}>
              {off ? (
                `En pausa · ${category.name}`
              ) : (
                <>
                  Todos los {rule.day} · {due ? <AppText style={styles.due}>sin registrar</AppText> : category.name}
                </>
              )}
            </AppText>
          </View>
        </View>
        <View style={styles.actions}>
          <IconButton
            icon={off ? 'play' : 'pause'}
            size={30}
            iconSize={16}
            onPress={onToggle}
            accessibilityLabel={off ? `Activar ${name}` : `Pausar ${name}`}
          />
          <IconButton icon="trash" size={30} iconSize={16} onPress={onDelete} accessibilityLabel={`Eliminar ${name}`} />
        </View>
      </View>
    </SwipeRow>
  );
}

const useStyles = makeStyles((c) => ({
  // fondo opaco: las acciones esperan debajo de la fila
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: c.surface,
  },
  divider: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: c.lineSoft },
  summary: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, gap: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, fontSize: 14.5, lineHeight: 18.85, fontWeight: '500' },
  amount: { fontFamily: fonts.display, fontSize: 15, lineHeight: 19.5, fontVariant: ['tabular-nums'] },
  detail: { fontSize: 12.5, lineHeight: 16.9, color: c.ink3, paddingRight: 64, minHeight: 27 },
  due: { color: c.warn, fontWeight: '500' },
  actions: {
    position: 'absolute',
    right: 7,
    bottom: 8,
    flexDirection: 'row',
  },
  off: { opacity: 0.45 },
}));
