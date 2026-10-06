import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius } from '@/theme';
import { AppText } from './AppText';

interface TileProps {
  label: string;
  value: string;
  note: string;
  /** up: subió (naranja) · down: bajó (verde) */
  tone?: 'up' | 'down';
  width: number;
}

export function Tile({ label, value, note, tone, width }: TileProps) {
  return (
    <View style={[styles.tile, { width }]}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
      <AppText style={[styles.note, tone === 'up' && styles.up, tone === 'down' && styles.down]}>{note}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 15 },
  label: { fontSize: 12.5, lineHeight: 18.1, color: colors.ink2, marginBottom: 5 },
  value: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 30.45,
    letterSpacing: -0.63,
    fontVariant: ['tabular-nums'],
  },
  note: { fontSize: 12.5, lineHeight: 18.1, color: colors.ink3, marginTop: 2 },
  up: { color: colors.warn },
  down: { color: colors.ok },
});
