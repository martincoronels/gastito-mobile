import { StyleSheet, View } from 'react-native';

import { moneyParts } from '@/lib/money';
import { fonts } from '@/theme';
import { AppText } from './ui/AppText';

/** Un monto grande con los centavos chiquitos arriba, como el <sup> de la web. */
export function MoneyRich({ amount, size }: { amount: number; size: number }) {
  const { main, cents } = moneyParts(amount);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${main},${cents}`}>
      <AppText
        maxFontSizeMultiplier={1}
        style={[styles.main, { fontSize: size, lineHeight: size, letterSpacing: -0.045 * size }]}
      >
        {main}
      </AppText>
      <AppText
        maxFontSizeMultiplier={1}
        style={[styles.cents, { fontSize: size / 2, lineHeight: size / 2, marginTop: -0.36 * size }]}
      >
        {cents}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  main: { fontFamily: fonts.displayHero, fontVariant: ['tabular-nums'] },
  cents: { fontFamily: fonts.display },
});
