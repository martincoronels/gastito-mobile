import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { makeStyles } from '@/theme';
import { AppText } from './AppText';

export function FieldLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles();
  return <AppText style={[styles.label, style]}>{children}</AppText>;
}

const useStyles = makeStyles((c) => ({
  label: { fontSize: 13, lineHeight: 18.85, color: c.ink2, marginBottom: 8 },
}));
