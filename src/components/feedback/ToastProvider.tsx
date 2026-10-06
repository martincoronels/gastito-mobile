import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';

export interface ToastOptions {
  /** Un botón dentro del aviso, por ejemplo "Deshacer" */
  action?: { label: string; onPress: () => void };
}
type ShowToast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Muestra un aviso corto arriba de todo (incluso de las hojas y del teclado). */
export const useToast = () => useContext(ToastContext);

/** Medidas de la Dynamic Island (iPhone 14 Pro en adelante), en puntos. */
const ISLAND = { width: 126, height: 37 };
/** Los iPhone con isla tienen un margen superior de 59 pt o más; los de notch, 50 o menos. */
export const hasDynamicIsland = (topInset: number) => topInset >= 55;

const DURATION = 3400;
const DURATION_WITH_ACTION = 5200;
/** Con VoiceOver se deja más tiempo, para llegar al botón */
const DURATION_SCREEN_READER = 9000;

interface Current {
  id: number;
  message: string;
  action?: ToastOptions['action'];
}

/**
 * Los avisos salen de la Dynamic Island: arrancan del tamaño y lugar de la isla (negra, así se
 * confunden con ella) y se estiran hasta mostrar el mensaje. En iPhone sin isla bajan desde
 * arriba. Con "Reducir movimiento" solo aparecen.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const island = hasDynamicIsland(insets.top);
  const top = island ? Math.max(insets.top - 48, 8) : insets.top + 6;

  const [current, setCurrent] = useState<Current | null>(null);
  const progress = useSharedValue(0);
  const size = useSharedValue({ width: ISLAND.width, height: ISLAND.height });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nextId = useRef(0);
  const screenReader = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => (screenReader.current = on));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => (screenReader.current = on));
    return () => sub.remove();
  }, []);

  // al terminar de irse se desarma (así no queda nada invisible que intercepte toques),
  // salvo que mientras tanto haya llegado otro aviso
  const clear = useCallback((id: number) => setCurrent((c) => (c?.id === id ? null : c)), []);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    const id = nextId.current;
    progress.set(
      withTiming(0, { duration: reduceMotion ? 150 : 260, easing: Easing.bezier(0.4, 0, 0.6, 1) }, (finished) => {
        if (finished) scheduleOnRN(clear, id);
      }),
    );
  }, [progress, reduceMotion, clear]);

  const show = useCallback<ShowToast>(
    (message, options) => {
      nextId.current += 1;
      setCurrent({ id: nextId.current, message, action: options?.action });
      AccessibilityInfo.announceForAccessibility(message);
      progress.set(
        reduceMotion
          ? withTiming(1, { duration: 150 })
          : withSpring(1, { damping: 18, stiffness: 210, mass: 0.9, overshootClamping: false }),
      );
      clearTimeout(timer.current);
      const duration = screenReader.current
        ? DURATION_SCREEN_READER
        : options?.action
          ? DURATION_WITH_ACTION
          : DURATION;
      timer.current = setTimeout(hide, duration);
    },
    [progress, reduceMotion, hide],
  );

  useEffect(() => {
    const pending = timer;
    return () => clearTimeout(pending.current);
  }, []);

  const pillStyle = useAnimatedStyle(() => {
    const p = progress.get();
    const { width, height } = size.get();
    // invisible en reposo (por si la isla real no coincide al píxel)
    const opacity = interpolate(p, [0, 0.04], [0, 1], 'clamp');
    if (reduceMotion) return { opacity: p, transform: [] };
    if (island) {
      const sx = interpolate(p, [0, 1], [Math.min(ISLAND.width / width, 1), 1]);
      const sy = interpolate(p, [0, 1], [Math.min(ISLAND.height / height, 1), 1]);
      return { opacity, transform: [{ scaleX: sx }, { scaleY: sy }] };
    }
    return { opacity: Math.min(p * 1.6, 1), transform: [{ translateY: (1 - p) * -(height + top + 8) }] };
  });
  const contentStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : interpolate(progress.get(), [0.55, 1], [0, 1], 'clamp'),
  }));

  const runAction = () => {
    const action = current?.action;
    hide();
    action?.onPress();
  };

  return (
    <ToastContext value={show}>
      {children}
      <View style={[styles.layer, { top }]}>
        {current ? (
          <Animated.View
            onLayout={(e) => size.set({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
            style={[styles.pill, { maxWidth: screenWidth - 24, minHeight: ISLAND.height }, pillStyle]}
          >
            <Pressable
              onPress={hide}
              accessibilityRole="alert"
              accessibilityLabel={current.message}
              accessibilityHint="Toca para cerrar el aviso"
              style={styles.body}
            >
              <Animated.View style={[styles.content, contentStyle]}>
                <AppText style={styles.text} maxFontSizeMultiplier={1.25}>
                  {current.message}
                </AppText>
                {current.action ? (
                  <Pressable
                    onPress={runAction}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={current.action.label}
                    style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                  >
                    <AppText style={styles.actionText} maxFontSizeMultiplier={1.25}>
                      {current.action.label}
                    </AppText>
                  </Pressable>
                ) : null}
              </Animated.View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
    pointerEvents: 'box-none',
  },
  // negro puro en los dos temas: es el color de la isla
  pill: {
    minWidth: ISLAND.width,
    backgroundColor: '#000000',
    borderRadius: 22,
    borderCurve: 'continuous',
    transformOrigin: 'top',
    boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
  },
  body: { paddingVertical: 10, paddingLeft: 18, paddingRight: 10, minHeight: ISLAND.height, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flexShrink: 1, color: '#FFFFFF', fontSize: 13.5, lineHeight: 19, paddingRight: 8 },
  action: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginLeft: -4,
  },
  actionPressed: { backgroundColor: 'rgba(255,255,255,0.28)' },
  actionText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '600' },
});
