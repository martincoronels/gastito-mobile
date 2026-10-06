import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';
import { Icon } from './Icon';
import type { IconName } from './icons';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: number;
  iconSize?: number;
  color?: string;
  pressedColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  size = 38,
  iconSize = 20,
  color,
  pressedColor,
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        style,
        pressed && { backgroundColor: pressedColor ?? colors.ghost },
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} size={iconSize} color={color ?? colors.ink2} />
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  base: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.25 },
}));
