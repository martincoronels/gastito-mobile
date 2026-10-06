import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { money } from '@/lib/money';
import { fonts, makeStyles } from '@/theme';

interface BudgetCardProps {
  spent: number;
  budget: number;
  /** Fijos del mes que todavía no se registraron: ya están comprometidos */
  upcomingFixed: number;
  /** Días que faltan del mes (0 si es un mes pasado) */
  daysLeft: number;
}

/** Cuánto va del presupuesto y cuánto queda por día, descontando los fijos que faltan pagar. */
export function budgetMessage({ spent, budget, upcomingFixed, daysLeft }: BudgetCardProps): string {
  const left = budget - spent;
  if (left < 0) return `Te pasaste por ${money(-left)}.`;
  if (!daysLeft) return `Te sobraron ${money(left)}.`;
  const days = daysLeft === 1 ? 'el día que falta' : `los ${daysLeft} días que faltan`;
  if (!upcomingFixed) return `Te quedan ${money(left)} para ${days} (${money(left / daysLeft)} por día).`;
  const free = left - upcomingFixed;
  if (free <= 0) {
    return `Te quedan ${money(left)}, pero tenés ${money(upcomingFixed)} de fijos por pagar: no te alcanza.`;
  }
  return `Te quedan ${money(left)}. Descontando ${money(upcomingFixed)} de fijos por pagar, son ${money(free / daysLeft)} por día para ${days}.`;
}

export function BudgetCard(props: BudgetCardProps) {
  const styles = useStyles();
  const { spent, budget, upcomingFixed } = props;
  const over = spent > budget;
  const spentPct = Math.min((spent / budget) * 100, 100);
  const committedPct = over ? 0 : Math.min((upcomingFixed / budget) * 100, 100 - spentPct);
  const message = budgetMessage(props);
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Presupuesto: ${money(spent)} de ${money(budget)}, ${Math.round((spent / budget) * 100)}%. ${message}`}
    >
      <View style={styles.row}>
        <AppText style={styles.amount}>{money(spent)}</AppText>
        <AppText style={styles.of}>de {money(budget)}</AppText>
        <AppText style={styles.pct}>{Math.round((spent / budget) * 100)}%</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${spentPct}%` }, over && styles.fillOver]} />
        {committedPct > 0 ? <View style={[styles.committed, { width: `${committedPct}%` }]} /> : null}
      </View>
      <AppText style={styles.message}>{message}</AppText>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surface, borderRadius: 16, borderCurve: 'continuous', padding: 15 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amount: { fontFamily: fonts.display, fontSize: 17, fontVariant: ['tabular-nums'] },
  of: { fontSize: 14 },
  pct: { marginLeft: 'auto', fontSize: 13, color: c.ink2 },
  track: {
    flexDirection: 'row',
    height: 9,
    borderRadius: 999,
    backgroundColor: c.lineSoft,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: c.accent },
  fillOver: { backgroundColor: c.warn },
  // lo comprometido en fijos: el mismo color, más tenue, pegado a lo gastado
  committed: {
    height: '100%',
    backgroundColor: c.accent,
    opacity: 0.25,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  message: { marginTop: 9, fontSize: 13, lineHeight: 18.85, color: c.ink2 },
}));
