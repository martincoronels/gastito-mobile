import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { GlassSurface, liquidGlass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/icons';
import { haptics } from '@/lib/haptics';
import type { ViewId } from '@/state/reducer';
import { makeStyles, PAD, TAB_BAR, useTheme } from '@/theme';

/** Resumen va al medio: es la pantalla principal de la app. */
const TABS: readonly { id: ViewId; label: string; icon: IconName }[] = [
  { id: 'movimientos', label: 'Movimientos', icon: 'list' },
  { id: 'resumen', label: 'Resumen', icon: 'chart' },
  { id: 'fijos', label: 'Fijos', icon: 'repeat' },
];

/** Distancia de la barra flotante al borde de abajo, y cuánto lugar tiene que dejarle el contenido. */
export function useTabBarFrame() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom - 8, 14);
  return { bottom, contentInset: bottom + TAB_BAR.height + 30 };
}

/**
 * La barra de pestañas flotante, como en iOS 26: una cápsula de vidrio (Liquid Glass donde existe)
 * que deja lugar al botón + a su derecha. El contenido pasa por debajo.
 */
export function BottomNav({ current, onChange }: { current: ViewId; onChange: (view: ViewId) => void }) {
  const styles = useStyles();
  const { bottom } = useTabBarFrame();
  return (
    <View style={[styles.frame, { bottom, right: PAD + TAB_BAR.fab + TAB_BAR.gap }]}>
      <GlassSurface style={styles.capsule}>
        <View style={styles.row} accessibilityRole="tablist">
          {TABS.map((tab) => (
            <NavButton
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={tab.id === current}
              onPress={() => {
                if (tab.id !== current) haptics.selection();
                onChange(tab.id);
              }}
            />
          ))}
        </View>
      </GlassSurface>
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
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const color = active ? colors.ink : colors.ink2;
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      onPressIn={() => scale.set(withTiming(0.92, { duration: 160 }))}
      onPressOut={() => scale.set(withTiming(1, { duration: 180 }))}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.item, active && styles.itemActive, pressStyle]}>
        <Icon name={icon} size={21} color={color} strokeWidth={active ? 2.1 : 1.9} />
        <AppText style={[styles.label, { color }, active && styles.labelActive]} maxFontSizeMultiplier={1.15}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((_c, t) => ({
  frame: {
    position: 'absolute',
    left: PAD,
    height: TAB_BAR.height,
    borderRadius: TAB_BAR.height / 2,
    // sin Liquid Glass, una sombra suave la despega del contenido
    boxShadow: liquidGlass
      ? undefined
      : t.scheme === 'dark'
        ? '0 8px 24px rgba(0,0,0,0.45)'
        : '0 8px 24px rgba(21,34,32,0.14)',
  },
  capsule: { flex: 1, borderRadius: TAB_BAR.height / 2, borderCurve: 'continuous' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 },
  button: { flex: 1, height: '100%', justifyContent: 'center' },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    height: TAB_BAR.height - 10,
    borderRadius: (TAB_BAR.height - 10) / 2,
    borderCurve: 'continuous',
  },
  itemActive: { backgroundColor: t.scheme === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(21,34,32,0.07)' },
  label: { fontSize: 10.5, lineHeight: 14 },
  labelActive: { fontWeight: '600' },
}));
