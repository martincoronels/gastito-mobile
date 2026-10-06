import type { ReactNode } from 'react';
import { View } from 'react-native';

import { fonts, makeStyles, radius } from '@/theme';
import { AppText } from './AppText';

export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <AppText style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      <AppText style={styles.text}>{text}</AppText>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 19,
    lineHeight: 27.5,
    letterSpacing: -0.38,
    marginBottom: 6,
    textAlign: 'center',
  },
  text: { fontSize: 14.5, lineHeight: 21, color: c.ink2, textAlign: 'center', maxWidth: 300, marginBottom: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
}));
