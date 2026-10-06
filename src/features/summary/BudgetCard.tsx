import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { money } from '@/lib/money';
import { colors, fonts, radius } from '@/theme';

export function BudgetCard({ spent, budget, daysLeft }: { spent: number; budget: number; daysLeft: number }) {
  const over = spent > budget;
  const left = budget - spent;
  const message = over
    ? `Te pasaste por ${money(-left)}.`
    : `Te quedan ${money(left)}${daysLeft ? ` para los ${daysLeft} días que faltan (${money(left / daysLeft)} por día).` : '.'}`;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <AppText style={styles.amount}>{money(spent)}</AppText>
        <AppText style={styles.of}>de {money(budget)}</AppText>
        <AppText style={styles.pct}>{Math.round((spent / budget) * 100)}%</AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min((spent / budget) * 100, 100)}%` }, over && styles.fillOver]} />
      </View>
      <AppText style={styles.message}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 15 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  amount: { fontFamily: fonts.display, fontSize: 17, fontVariant: ['tabular-nums'] },
  of: { fontSize: 14 },
  pct: { marginLeft: 'auto', fontSize: 13, color: colors.ink2 },
  track: { height: 9, borderRadius: 999, backgroundColor: colors.lineSoft, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: colors.ink },
  fillOver: { backgroundColor: colors.warn },
  message: { marginTop: 9, fontSize: 13, lineHeight: 18.85, color: colors.ink2 },
});
