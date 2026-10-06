import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { colors } from '@/theme';
import { AppText } from './AppText';

export function FieldLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <AppText style={[styles.label, style]}>{children}</AppText>;
}

const styles = StyleSheet.create({
  label: { fontSize: 13, lineHeight: 18.85, color: colors.ink2, marginBottom: 8 },
});
