import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, fonts } from '@/theme';
import { LOGO_ARCS } from './Logo';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const ARC_DELAYS = [50, 170, 290, 410];
const DASH = 21.5;

function DrawnArc({ d, color, delay, animate }: { d: string; color: string; delay: number; animate: boolean }) {
  const offset = useSharedValue(animate ? DASH : 0);
  useEffect(() => {
    if (animate)
      offset.set(withDelay(delay, withTiming(0, { duration: 550, easing: Easing.bezier(0.3, 0.9, 0.3, 1) })));
  }, [animate, delay, offset]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));
  return <AnimatedPath d={d} stroke={color} strokeDasharray={[DASH, DASH]} animatedProps={animatedProps} />;
}

/**
 * La apertura de la web: los arcos se dibujan uno por uno y aparece el nombre. Se va sola a los
 * 1,75 s (o al tocarla). La pantalla de carga nativa de iOS es solo el color de fondo, así que
 * el paso de una a otra no se nota.
 */
export function IntroSplash() {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hidden = useRef(false);

  const fade = useSharedValue(1);
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const wordmark = useSharedValue(reduceMotion ? 1 : 0);
  const tagline = useSharedValue(reduceMotion ? 1 : 0);

  const hide = useCallback(() => {
    if (hidden.current) return;
    hidden.current = true;
    setLeaving(true);
    fade.set(
      withTiming(0, { duration: reduceMotion ? 0 : 500 }, (finished) => {
        if (finished) scheduleOnRN(setGone, true);
      }),
    );
  }, [fade, reduceMotion]);

  useEffect(() => {
    if (!reduceMotion) {
      pop.set(withTiming(1, { duration: 600, easing: Easing.bezier(0.2, 0.9, 0.3, 1) }));
      wordmark.set(withDelay(580, withTiming(1, { duration: 500, easing: Easing.ease })));
      tagline.set(withDelay(700, withTiming(1, { duration: 500, easing: Easing.ease })));
    }
    const timer = setTimeout(hide, reduceMotion ? 400 : 1750);
    return () => clearTimeout(timer);
  }, [hide, pop, reduceMotion, tagline, wordmark]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const markStyle = useAnimatedStyle(() => ({ opacity: pop.get(), transform: [{ scale: 0.86 + 0.14 * pop.get() }] }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordmark.get(),
    transform: [{ translateY: 7 * (1 - wordmark.get()) }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagline.get(),
    transform: [{ translateY: 7 * (1 - tagline.get()) }],
  }));

  if (gone) return null;
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { paddingBottom: height * 0.07 },
        leaving && styles.passThrough,
        rootStyle,
      ]}
    >
      <Pressable style={styles.content} onPress={hide} accessibilityLabel="Gastito, tus gastos, mes a mes">
        <Animated.View style={markStyle}>
          <Svg width={86} height={86} viewBox="0 0 32 32">
            <G fill="none" strokeWidth={6} strokeLinecap="round">
              {LOGO_ARCS.map((arc, i) => (
                <DrawnArc key={arc.d} d={arc.d} color={arc.color} delay={ARC_DELAYS[i]} animate={!reduceMotion} />
              ))}
            </G>
          </Svg>
        </Animated.View>
        <Animated.Text maxFontSizeMultiplier={1.2} style={[styles.wordmark, wordStyle]}>
          Gastito
        </Animated.Text>
        <Animated.Text maxFontSizeMultiplier={1.2} style={[styles.tagline, tagStyle]}>
          tus gastos, mes a mes
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.canvas },
  passThrough: { pointerEvents: 'none' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  wordmark: { fontFamily: fonts.displayHero, fontSize: 29, letterSpacing: -1.3, color: colors.ink },
  tagline: { fontSize: 13, color: colors.ink2, marginTop: -11 },
});
