import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './icons';

export interface SwipeAction {
  label: string;
  icon: IconName;
  /** Color de fondo de la acción (el texto va en blanco) */
  color: string;
  onPress: () => void;
}

/** Colores fijos de las acciones (los mismos en claro y oscuro, con texto blanco legible). */
export const SWIPE_COLORS = { green: '#1F7A4C', orange: '#B4561F', red: '#D13F1F' } as const;

const ACTION_WIDTH = 78;

/** Envuelve el toque de la fila: si se acaba de deslizar o está abierta, la cierra en vez de tocarla. */
export type PressGuard = (onPress: () => void) => () => void;

interface SwipeRowProps {
  children: ReactNode | ((guard: PressGuard) => ReactNode);
  /** Las que aparecen al deslizar hacia la derecha */
  leftActions?: SwipeAction[];
  /** Las que aparecen al deslizar hacia la izquierda (la destructiva va última, en el borde) */
  rightActions?: SwipeAction[];
  /** Para cerrar la fila que estaba abierta cuando se abre otra */
  onOpen?: (methods: SwipeableMethods) => void;
}

/**
 * Fila con acciones al deslizar, como en Mail o Recordatorios. Las acciones quedan ocultas para
 * VoiceOver: la fila tiene que ofrecer las mismas como acciones de accesibilidad.
 */
export function SwipeRow({ children, leftActions = [], rightActions = [], onOpen }: SwipeRowProps) {
  const ref = useRef<SwipeableMethods>(null);
  const state = useRef({ open: false, movedAt: 0 });
  const moved = () => {
    state.current.movedAt = Date.now();
  };
  const guard: PressGuard = (onPress) => () => {
    if (state.current.open) {
      ref.current?.close();
      return;
    }
    // el toque que llega al soltar un deslizamiento no cuenta
    if (Date.now() - state.current.movedAt < 400) return;
    onPress();
  };
  return (
    <Swipeable
      ref={ref}
      onSwipeableOpenStartDrag={moved}
      onSwipeableCloseStartDrag={moved}
      onSwipeableWillClose={() => {
        state.current.open = false;
        moved();
      }}
      onSwipeableClose={() => {
        state.current.open = false;
      }}
      friction={1.6}
      leftThreshold={36}
      rightThreshold={36}
      overshootLeft={false}
      overshootRight={false}
      dragOffsetFromLeftEdge={14}
      dragOffsetFromRightEdge={14}
      onSwipeableWillOpen={() => {
        state.current.open = true;
        moved();
        haptics.light();
        if (ref.current) onOpen?.(ref.current);
      }}
      renderLeftActions={
        leftActions.length
          ? (_progress, translation, methods) => (
              <ActionPanel side="left" actions={leftActions} translation={translation} methods={methods} />
            )
          : undefined
      }
      renderRightActions={
        rightActions.length
          ? (_progress, translation, methods) => (
              <ActionPanel side="right" actions={rightActions} translation={translation} methods={methods} />
            )
          : undefined
      }
    >
      {typeof children === 'function' ? children(guard) : children}
    </Swipeable>
  );
}

function ActionPanel({
  side,
  actions,
  translation,
  methods,
}: {
  side: 'left' | 'right';
  actions: SwipeAction[];
  translation: SharedValue<number>;
  methods: SwipeableMethods;
}) {
  const width = actions.length * ACTION_WIDTH;
  // las acciones entran deslizándose junto con la fila
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: side === 'right' ? Math.max(0, width + translation.get()) : Math.min(0, translation.get() - width),
      },
    ],
  }));
  return (
    <Animated.View
      style={[styles.panel, { width }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => {
            methods.close();
            action.onPress();
          }}
          style={({ pressed }) => [styles.action, { backgroundColor: action.color }, pressed && styles.pressed]}
        >
          <View style={styles.inner}>
            <Icon name={action.icon} size={19} color="#FFFFFF" strokeWidth={2} />
            <AppText style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {action.label}
            </AppText>
          </View>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { flexDirection: 'row', height: '100%' },
  action: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  inner: { alignItems: 'center', gap: 4 },
  label: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
