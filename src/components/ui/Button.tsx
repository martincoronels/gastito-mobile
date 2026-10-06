import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  wide?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  wide = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        containers[variant],
        wide && styles.wide,
        pressed && styles.pressed,
        style,
      ]}
    >
      <AppText numberOfLines={1} style={[styles.label, size === 'sm' && styles.labelSm, labels[variant]]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { height: 36, paddingHorizontal: 14 },
  wide: { alignSelf: 'stretch' },
  pressed: { opacity: 0.88 },
  label: { fontSize: 15, fontWeight: '600' },
  labelSm: { fontSize: 14 },
});

const containers = StyleSheet.create({
  primary: { backgroundColor: colors.ink },
  ghost: { backgroundColor: colors.ghost },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerBg },
});

const labels = StyleSheet.create({
  primary: { color: colors.white },
  ghost: { color: colors.ink },
  quiet: { color: colors.ink2, fontWeight: '500' },
  danger: { color: colors.dangerInk },
});
