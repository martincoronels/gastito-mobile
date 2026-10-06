import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  wide?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  wide = false,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.sm,
        styles[variant],
        wide && styles.wide,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText
        numberOfLines={1}
        style={[styles.label, size === 'sm' && styles.labelSm, styles[`${variant}Label` as const]]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
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
  disabled: { opacity: 0.4 },
  label: { fontSize: 15, fontWeight: '600' },
  labelSm: { fontSize: 14 },

  primary: { backgroundColor: c.accent },
  ghost: { backgroundColor: c.ghost },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: c.dangerBg },
  primaryLabel: { color: c.onAccent },
  ghostLabel: { color: c.ink },
  quietLabel: { color: c.ink2, fontWeight: '500' },
  dangerLabel: { color: c.dangerInk },
}));
