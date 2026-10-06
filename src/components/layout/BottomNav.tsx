import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/icons';
import type { ViewId } from '@/state/reducer';
import { makeStyles, useTheme } from '@/theme';

/** Resumen va al medio: es la pantalla principal de la app. */
const TABS: readonly { id: ViewId; label: string; icon: IconName }[] = [
  { id: 'movimientos', label: 'Movimientos', icon: 'list' },
  { id: 'resumen', label: 'Resumen', icon: 'chart' },
  { id: 'fijos', label: 'Fijos', icon: 'repeat' },
];

export function BottomNav({ current, onChange }: { current: ViewId; onChange: (view: ViewId) => void }) {
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.glass]} />
      {TABS.map((tab) => (
        <NavButton
          key={tab.id}
          label={tab.label}
          icon={tab.icon}
          active={tab.id === current}
          onPress={() => onChange(tab.id)}
        />
      ))}
    </View>
  );
}

function NavButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const color = active ? colors.ink : colors.ink3;
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.9, { duration: 180 }))}
      onPressOut={() => scale.set(withTiming(1, { duration: 180 }))}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.icon, active && styles.iconActive, iconStyle]}>
        <Icon name={icon} size={21} color={color} />
      </Animated.View>
      <AppText style={[styles.label, { color }, active && styles.labelActive]}>{label}</AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: c.line,
    overflow: 'hidden',
  },
  glass: { backgroundColor: c.navGlass },
  button: { flex: 1, alignItems: 'center', gap: 2, paddingTop: 7, paddingBottom: 8 },
  icon: { width: 52, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: c.navActive },
  label: { fontSize: 11, lineHeight: 15.95 },
  labelActive: { fontWeight: '600' },
}));
