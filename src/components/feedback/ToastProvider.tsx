import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme';

type ShowToast = (message: string) => void;
const ToastContext = createContext<ShowToast>(() => {});

/** Muestra un aviso corto abajo de la pantalla (3,4 s), por encima de todo, incluso de las hojas. */
export const useToast = () => useContext(ToastContext);

const EASE = { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const visible = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<ShowToast>(
    (text) => {
      setMessage(text);
      AccessibilityInfo.announceForAccessibility(text);
      visible.set(withTiming(1, EASE));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => visible.set(withTiming(0, EASE)), 3400);
    },
    [visible],
  );

  useEffect(() => {
    const pending = timer;
    return () => clearTimeout(pending.current);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: visible.get(),
    transform: [{ translateY: (1 - visible.get()) * 14 }],
  }));

  return (
    <ToastContext value={show}>
      {children}
      <View style={[styles.layer, { bottom: 88 + insets.bottom }]}>
        <Animated.View style={[styles.toast, style]}>
          <AppText style={styles.text}>{message}</AppText>
        </Animated.View>
      </View>
    </ToastContext>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  toast: {
    maxWidth: '88%',
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 17,
  },
  text: { color: colors.white, fontSize: 13.5, lineHeight: 19.6, textAlign: 'center' },
});
