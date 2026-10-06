import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { sumOf } from '@/domain/selectors';
import type { RecurringExpense } from '@/domain/types';
import { monthName, type MonthKey } from '@/lib/dates';
import { money } from '@/lib/money';
import { plural } from '@/lib/text';
import { makeStyles, radius } from '@/theme';

export function PendingBanner({
  rules,
  month,
  onApply,
}: {
  rules: RecurringExpense[];
  month: MonthKey;
  onApply: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.banner}>
      <AppText style={styles.text}>
        Tenés {plural(rules.length, 'gasto fijo', 'gastos fijos')} sin registrar en {monthName(month)} por{' '}
        {money(sumOf(rules))}.
      </AppText>
      <Button size="sm" label="Registrar" onPress={onApply} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.bannerBg,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  text: { flex: 1, fontSize: 14, lineHeight: 20.3 },
}));
