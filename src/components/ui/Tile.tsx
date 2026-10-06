import { View } from 'react-native';

import { fonts, makeStyles, radius } from '@/theme';
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
  const styles = useStyles();
  return (
    <View style={[styles.tile, { width }]} accessible accessibilityLabel={`${label}: ${value}. ${note}`}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
      <AppText style={[styles.note, tone === 'up' && styles.up, tone === 'down' && styles.down]}>{note}</AppText>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  tile: { backgroundColor: c.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 15 },
  label: { fontSize: 12.5, lineHeight: 18.1, color: c.ink2, marginBottom: 5 },
  value: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 30.45,
    letterSpacing: -0.63,
    fontVariant: ['tabular-nums'],
  },
  note: { fontSize: 12.5, lineHeight: 18.1, color: c.ink3, marginTop: 2 },
  up: { color: c.warn },
  down: { color: c.ok },
}));
