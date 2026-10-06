import { StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme';
import { AppText } from './AppText';

export function SectionHeader({ title, side }: { title: string; side?: string }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {side ? <AppText style={styles.side}>{side}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
  title: { fontFamily: fonts.display, fontSize: 16, lineHeight: 23.2, letterSpacing: -0.16 },
  side: { marginLeft: 'auto', fontSize: 13.5, color: colors.ink3 },
});
