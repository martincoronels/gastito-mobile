import { useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useLock } from '@/state/LockProvider';
import { fonts, makeStyles, useTheme } from '@/theme';
import { Logo } from './Logo';

/**
 * Lo que tapa la app: la pantalla de bloqueo (con el botón de Face ID) o, si la app solo dejó de
 * estar activa, la misma pantalla sin botón (es lo que se ve en el selector de apps). Aparece de
 * golpe, sin animación, para que nunca se vea nada por debajo; al desbloquear se desvanece.
 */
export function LockLayer() {
  const { locked, shielded, authenticating, capability, unlock } = useLock();
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const covering = locked || shielded;
  const [mounted, setMounted] = useState(covering);
  const opacity = useSharedValue(covering ? 1 : 0);

  if (covering && !mounted) setMounted(true);

  useEffect(() => {
    if (covering) {
      opacity.set(1);
      return;
    }
    opacity.set(
      withTiming(0, { duration: reduceMotion ? 0 : 220 }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      }),
    );
  }, [covering, opacity, reduceMotion]);

  // al bloquearse, se pide Face ID solo una vez (si se cancela, queda el botón)
  const asked = useRef(false);
  useEffect(() => {
    if (!locked) {
      asked.current = false;
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    // un instante de espera: que termine de aparecer la app antes del cartel de Face ID
    const askSoon = () => {
      timers.push(
        setTimeout(() => {
          if (asked.current || RNAppState.currentState !== 'active') return;
          asked.current = true;
          void unlock();
        }, 350),
      );
    };
    askSoon();
    const sub = RNAppState.addEventListener('change', (state) => state === 'active' && askSoon());
    return () => {
      timers.forEach(clearTimeout);
      sub.remove();
    };
  }, [locked, unlock]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  if (!mounted) return null;

  const method = capability?.method ?? 'Face ID';
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, !covering && styles.passThrough, style]}
      accessibilityViewIsModal
    >
      <View style={styles.center}>
        <Logo size={64} />
        <AppText style={styles.wordmark} maxFontSizeMultiplier={1.2}>
          Gastito
        </AppText>
        {locked ? (
          <View style={styles.status}>
            <Icon name="lock" size={14} color={colors.ink3} strokeWidth={2.1} />
            <AppText style={styles.statusText}>Bloqueado</AppText>
          </View>
        ) : null}
      </View>
      {locked ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 28 }]}>
          <Button
            label={method === 'el código' ? 'Desbloquear' : `Desbloquear con ${method}`}
            onPress={() => void unlock()}
            disabled={authenticating}
            wide
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { backgroundColor: c.canvas, zIndex: 2000, elevation: 2000 },
  passThrough: { pointerEvents: 'none' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingBottom: 40 },
  wordmark: { fontFamily: fonts.displayHero, fontSize: 29, letterSpacing: -1.3 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  statusText: { fontSize: 13.5, color: c.ink3 },
  bottom: { paddingHorizontal: 32 },
}));
