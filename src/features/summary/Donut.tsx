import { useEffect, useMemo } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { MoneyRich } from '@/components/MoneyRich';
import { AppText } from '@/components/ui/AppText';
import { ICON_PATHS } from '@/components/ui/icons';
import {
  DONUT,
  hitTestDonut,
  isSliceOn,
  layoutDonut,
  type ArcSegment,
  type DonutSegment,
  type DonutSlice,
  type DotSegment,
} from '@/domain/donut';
import { safeColor } from '@/domain/sanitize';
import type { CategoryIcon } from '@/domain/types';
import { clamp } from '@/lib/math';
import { money } from '@/lib/money';
import { FILL, makeStyles, useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const DIMMED = 0.24;
const DIM_MS = 180;
/**
 * En la web la caja de la dona mide 6,8 px más que el círculo (el SVG va en línea y suma el
 * renglón) y el centro se calcula sobre esa caja. Se replica para que el texto quede igual.
 */
const BOX_EXTRA = 6.8 / 320;

export interface DonutCenter {
  caption: string;
  amount: number;
  sub: string;
}

interface DonutProps {
  slices: DonutSlice[];
  sum: number;
  selected: string | null;
  /** Cuando cambia, las porciones se vuelven a dibujar con animación */
  animationKey: number;
  center: DonutCenter;
  onSelect: (id: string) => void;
}

interface SegmentProps {
  color: string;
  order: number;
  dimmed: boolean;
  animate: boolean;
}

/** El gráfico de dona por categoría, con el total (o la categoría elegida) en el medio. */
export function Donut({ slices, sum, selected, animationKey, center, onSelect }: DonutProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const size = Math.min(320, width * 0.84);
  const box = size * (1 + BOX_EXTRA);
  const scale = size / DONUT.VIEWBOX;
  const segments = useMemo(() => layoutDonut(slices, sum), [slices, sum]);

  // el toque se resuelve con geometría: qué porción hay en ese ángulo del anillo
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((e, success) => {
          if (!success) return;
          const index = hitTestDonut(segments, e.x / scale, e.y / scale);
          if (index >= 0) onSelect(slices[index].id);
        }),
    [segments, scale, slices, onSelect],
  );

  const isDimmed = (slice: DonutSlice) => selected != null && !isSliceOn(slice, selected);
  const glowIndex = selected ? slices.findIndex((s) => isSliceOn(s, selected)) : -1;
  const summary = slices.map((s) => `${s.category.name} ${money(s.sum)}`).join(', ');
  let arcOrder = 0;
  let dotOrder = 0;

  return (
    <GestureDetector gesture={tap}>
      <View
        style={{ width: size, height: box }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Gastos por categoría: ${summary || 'sin gastos'}`}
      >
        {glowIndex >= 0 ? (
          <SelectedGlow
            key={`${animationKey}-${slices[glowIndex].id}`}
            segment={segments[glowIndex]}
            color={safeColor(slices[glowIndex].category.color)}
            size={size}
          />
        ) : null}
        <Svg width={size} height={size} viewBox={`0 0 ${DONUT.VIEWBOX} ${DONUT.VIEWBOX}`}>
          {segments.length === 0 ? (
            <Circle
              cx={DONUT.CX}
              cy={DONUT.CY}
              r={DONUT.R}
              fill="none"
              stroke={colors.donutEmpty}
              strokeWidth={DONUT.W}
              strokeDasharray={[2, 12]}
              strokeLinecap="round"
            />
          ) : null}
          {segments.map((segment, i) => {
            const slice = slices[i];
            const common = { color: safeColor(slice.category.color), dimmed: isDimmed(slice), animate: !reduceMotion };
            const key = `${animationKey}-${slice.id}`;
            return segment.kind === 'arc' ? (
              <ArcView key={key} segment={segment} order={arcOrder++} {...common} />
            ) : (
              <DotView key={key} segment={segment} order={dotOrder++} {...common} />
            );
          })}
          {segments.map((segment, i) =>
            slices[i].category.emoji ? null : (
              <SegmentIcon
                key={slices[i].id}
                x={segment.iconX}
                y={segment.iconY}
                icon={slices[i].category.icon ?? 'dots'}
                dimmed={isDimmed(slices[i])}
              />
            ),
          )}
        </Svg>
        {segments.map((segment, i) => {
          const emoji = slices[i].category.emoji;
          return emoji ? (
            <EmojiIcon
              key={slices[i].id}
              emoji={emoji}
              x={segment.iconX}
              y={segment.iconY}
              scale={scale}
              dimmed={isDimmed(slices[i])}
            />
          ) : null;
        })}
        <View style={[styles.center, { left: size * 0.22, right: size * 0.22, top: box * 0.22, bottom: box * 0.22 }]}>
          <AppText style={styles.caption} numberOfLines={1}>
            {center.caption}
          </AppText>
          <MoneyRich amount={center.amount} size={clamp(width * 0.074, 25, 34)} />
          <AppText style={styles.sub}>{center.sub}</AppText>
        </View>
      </View>
    </GestureDetector>
  );
}

/** Arco que se dibuja de punta a punta al aparecer, y se apaga si hay otra porción elegida. */
function ArcView({ segment, color, order, dimmed, animate }: SegmentProps & { segment: ArcSegment }) {
  const length = segment.length + 1;
  const draw = useSharedValue(animate ? 0 : 1);
  const opacity = useSharedValue(dimmed ? DIMMED : 1);
  useEffect(() => {
    if (animate)
      draw.set(withDelay(order * 45, withTiming(1, { duration: 550, easing: Easing.bezier(0.25, 0.9, 0.3, 1) })));
  }, [animate, draw, order]);
  useEffect(() => {
    opacity.set(withTiming(dimmed ? DIMMED : 1, { duration: DIM_MS }));
  }, [dimmed, opacity]);
  const animatedProps = useAnimatedProps(
    () => ({ strokeDashoffset: length * (1 - draw.get()), opacity: opacity.get() }),
    [length],
  );
  return (
    <AnimatedPath
      d={segment.d}
      stroke={color}
      strokeWidth={DONUT.W}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  );
}

/** Porción tan chica que se dibuja como un punto. */
function DotView({ segment, color, order, dimmed, animate }: SegmentProps & { segment: DotSegment }) {
  const appear = useSharedValue(animate ? 0 : 1);
  const opacity = useSharedValue(dimmed ? DIMMED : 1);
  useEffect(() => {
    if (animate) appear.set(withDelay(300 + order * 45, withTiming(1, { duration: 300, easing: Easing.ease })));
  }, [animate, appear, order]);
  useEffect(() => {
    opacity.set(withTiming(dimmed ? DIMMED : 1, { duration: DIM_MS }));
  }, [dimmed, opacity]);
  const animatedProps = useAnimatedProps(() => ({ opacity: appear.get() * opacity.get() }));
  return <AnimatedCircle cx={segment.cx} cy={segment.cy} r={DONUT.W / 2} fill={color} animatedProps={animatedProps} />;
}

function SegmentIcon({ x, y, icon, dimmed }: { x: number; y: number; icon: CategoryIcon; dimmed: boolean }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(dimmed ? DIMMED : 0.97);
  useEffect(() => {
    opacity.set(withTiming(dimmed ? DIMMED : 0.97, { duration: DIM_MS }));
  }, [dimmed, opacity]);
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.get() }));
  return (
    <AnimatedG
      animatedProps={animatedProps}
      transform={`translate(${(x - 8.4).toFixed(2)} ${(y - 8.4).toFixed(2)}) scale(0.7)`}
      stroke={colors.white}
      strokeWidth={2.2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[icon].map((d) => (
        <Path key={d} d={d} />
      ))}
    </AnimatedG>
  );
}

function EmojiIcon({
  emoji,
  x,
  y,
  scale,
  dimmed,
}: {
  emoji: string;
  x: number;
  y: number;
  scale: number;
  dimmed: boolean;
}) {
  const styles = useStyles();
  const opacity = useSharedValue(dimmed ? DIMMED : 1);
  useEffect(() => {
    opacity.set(withTiming(dimmed ? DIMMED : 1, { duration: DIM_MS }));
  }, [dimmed, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const box = DONUT.W * scale;
  return (
    <Animated.View
      style={[
        styles.emoji,
        { width: box, height: box, left: x * scale - box / 2, top: (y + 0.5) * scale - box / 2 },
        style,
      ]}
    >
      <AppText allowFontScaling={false} style={{ fontSize: 15 * scale }}>
        {emoji}
      </AppText>
    </Animated.View>
  );
}

/**
 * La sombra de la porción elegida (el drop-shadow de la web). En iOS, una sombra sobre una vista
 * sin fondo sigue la forma de lo que tiene adentro, así que se dibuja una copia de la porción
 * debajo de la dona y se le pone sombra.
 */
function SelectedGlow({ segment, color, size }: { segment: DonutSegment; color: string; size: number }) {
  const styles = useStyles();
  const appear = useSharedValue(0);
  useEffect(() => {
    appear.set(withTiming(1, { duration: DIM_MS }));
  }, [appear]);
  const style = useAnimatedStyle(() => ({ opacity: appear.get() }));
  return (
    <Animated.View style={[styles.glow, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${DONUT.VIEWBOX} ${DONUT.VIEWBOX}`}>
        {segment.kind === 'arc' ? (
          <Path d={segment.d} stroke={color} strokeWidth={DONUT.W} strokeLinecap="round" fill="none" />
        ) : (
          <Circle cx={segment.cx} cy={segment.cy} r={DONUT.W / 2} fill={color} />
        )}
      </Svg>
    </Animated.View>
  );
}

const useStyles = makeStyles((c, t) => ({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 2, pointerEvents: 'none' },
  caption: { fontSize: 12.5, lineHeight: 18.1, fontWeight: '500', color: c.ink2 },
  sub: { fontSize: 12.5, lineHeight: 18.1, color: c.ink3 },
  emoji: { position: 'absolute', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  glow: {
    ...FILL,
    pointerEvents: 'none',
    ...Platform.select({
      ios: {
        shadowColor: t.scheme === 'dark' ? '#000000' : c.ink,
        shadowOpacity: t.scheme === 'dark' ? 0.55 : 0.2,
        shadowRadius: 3.5,
        shadowOffset: { width: 0, height: 3 },
      },
      web: { filter: 'drop-shadow(0 3px 7px rgba(21,34,32,0.2))' },
      default: {},
    }),
  },
}));
