import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInput,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { colors, FILL, fonts, PAD } from '@/theme';

type Revealable = View | TextInput;
type Reveal = (target: Revealable | null, options?: { immediate?: boolean }) => void;

const RevealContext = createContext<Reveal>(() => {});
/** Lleva un elemento de la hoja a la vista (por ejemplo, un campo que quedó tapado por el teclado). */
export const useRevealInSheet = () => useContext(RevealContext);

const SLIDE = Easing.bezier(0.2, 0.9, 0.25, 1);

interface BottomSheetProps {
  open: boolean;
  title: string;
  /** Se pidió cerrar (X, fondo, arrastre o botón atrás de Android) */
  onRequestClose: () => void;
  /** Terminó la animación de salida */
  onClosed: () => void;
  children: ReactNode;
}

/**
 * La hoja que sube desde abajo, igual a la de la web: encabezado fijo con manija y X, contenido
 * con scroll, se cierra tocando el fondo, con la X o arrastrando el encabezado hacia abajo, y se
 * apoya arriba del teclado cuando hay un campo enfocado.
 */
export function BottomSheet({ open, title, onRequestClose, onClosed, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const scrim = useSharedValue(0);
  const drag = useSharedValue(0);
  const height = useSharedValue(1000);
  const [scrolled, setScrolled] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const scrollY = useRef(0);
  const viewportHeight = useRef(0);
  const lastTarget = useRef<Revealable | null>(null);

  useEffect(() => {
    if (open) {
      drag.set(0);
      progress.set(withTiming(1, { duration: reduceMotion ? 0 : 280, easing: SLIDE }));
      scrim.set(withTiming(1, { duration: reduceMotion ? 0 : 200 }));
    } else {
      scrim.set(withTiming(0, { duration: reduceMotion ? 0 : 200 }));
      progress.set(
        withTiming(0, { duration: reduceMotion ? 0 : 260, easing: SLIDE }, (finished) => {
          if (finished) scheduleOnRN(onClosed);
        }),
      );
    }
  }, [open, reduceMotion, onClosed, progress, scrim, drag]);

  // Android: el botón "atrás" cierra la hoja en vez de salir de la app
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onRequestClose]);

  /** Mueve solo el scroll de la hoja para que el elemento quede visible, con 16 pt de aire. */
  const scrollIntoView = useCallback((target: Revealable | null) => {
    const content = contentRef.current;
    if (!target || !content) return;
    target.measureLayout(
      content,
      (_x, y, _w, h) => {
        const top = scrollY.current;
        const visible = viewportHeight.current;
        const margin = 16;
        let delta = 0;
        if (y + h > top + visible - margin) delta = y + h - (top + visible - margin);
        if (y + delta < top + margin) delta = y - (top + margin);
        if (Math.abs(delta) > 1) scrollRef.current?.scrollTo({ y: Math.max(0, top + delta), animated: true });
      },
      () => {},
    );
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => scrollIntoView(lastTarget.current));
    return () => sub.remove();
  }, [scrollIntoView]);

  const reveal = useCallback<Reveal>(
    (target, options) => {
      lastTarget.current = target;
      // si el teclado está subiendo, se espera a que termine (y a que la hoja se acomode)
      const wait = options?.immediate ? 30 : Keyboard.isVisible() ? 80 : 350;
      setTimeout(() => scrollIntoView(target), wait);
    },
    [scrollIntoView],
  );

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    scrollY.current = y;
    const isScrolled = y > 2;
    setScrolled((prev) => (prev === isScrolled ? prev : isScrolled));
  }, []);

  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8) // solo arrastres hacia abajo
        .failOffsetX([-24, 24])
        .onStart(() => {
          scheduleOnRN(dismissKeyboard);
        })
        .onUpdate((e) => {
          drag.set(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          const y = Math.max(0, e.translationY);
          const fast = e.velocityY > 450 && y > 24;
          if (fast || y > Math.min(140, height.get() * 0.3)) scheduleOnRN(onRequestClose);
          else drag.set(withTiming(0, { duration: 200 }));
        }),
    [dismissKeyboard, drag, height, onRequestClose],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * (height.get() + 24) + drag.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrim.get() * (1 - Math.min(drag.get() / Math.max(height.get(), 1), 1)),
  }));

  return (
    <View style={styles.overlay}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} accessibilityLabel="Cerrar" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.frame, { paddingTop: 20 + insets.top }]}
      >
        <Animated.View
          style={[styles.sheet, sheetStyle]}
          onLayout={(e) => height.set(e.nativeEvent.layout.height)}
          accessibilityViewIsModal
        >
          <GestureDetector gesture={pan}>
            <View style={styles.top}>
              <View style={styles.grab} />
              <View style={styles.head}>
                <AppText style={styles.title} accessibilityRole="header" numberOfLines={1}>
                  {title}
                </AppText>
                <IconButton
                  icon="close"
                  size={34}
                  iconSize={18}
                  onPress={onRequestClose}
                  accessibilityLabel="Cerrar"
                  pressedColor={colors.softPressed}
                  style={styles.close}
                />
              </View>
              {scrolled ? <View style={styles.topLine} /> : null}
            </View>
          </GestureDetector>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            onLayout={(e) => {
              viewportHeight.current = e.nativeEvent.layout.height;
            }}
          >
            <View ref={contentRef} collapsable={false}>
              <RevealContext value={reveal}>{children}</RevealContext>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...FILL, pointerEvents: 'box-none' },
  scrim: { backgroundColor: colors.scrim },
  frame: { ...FILL, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: PAD,
    flexShrink: 1,
    overflow: 'hidden',
  },
  top: { marginHorizontal: -PAD, paddingHorizontal: PAD, paddingTop: 8, backgroundColor: colors.surface },
  grab: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 9,
    backgroundColor: colors.line,
    marginTop: 6,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 19, lineHeight: 27.5, letterSpacing: -0.38 },
  close: { marginRight: -4, backgroundColor: colors.softer },
  topLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: colors.lineSoft },
  scroll: { flexGrow: 0, flexShrink: 1 },
});
