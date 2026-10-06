import { useMemo, type ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { currentMonth, shiftMonth } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { useAppState } from '@/state/AppStateProvider';
import { useAppActions } from '@/state/useAppActions';

/** Cuánto hay que deslizar (contando el impulso) para cambiar de mes. */
const DISTANCE = 64;

/**
 * Deslizar horizontalmente para ir al mes anterior o al siguiente, como al pasar páginas. El
 * contenido acompaña el dedo con resistencia; hacia un mes futuro hay tope.
 */
export function MonthSwipe({ children }: { children: ReactNode }) {
  const { ui } = useAppState();
  const actions = useAppActions();
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const canGoForward = shiftMonth(ui.month, 1) <= currentMonth();
  const { shiftMonth: goTo } = actions;

  const pan = useMemo(() => {
    const change = (delta: number) => {
      haptics.selection();
      goTo(delta);
    };
    return Gesture.Pan()
      .activeOffsetX([-16, 16])
      .failOffsetY([-12, 12])
      .onUpdate((e) => {
        const blocked = e.translationX < 0 && !canGoForward;
        offset.set(reduceMotion ? 0 : e.translationX * (blocked ? 0.12 : 0.3));
      })
      .onEnd((e) => {
        const dx = e.translationX + e.velocityX * 0.08;
        if (dx > DISTANCE) scheduleOnRN(change, -1);
        else if (dx < -DISTANCE && canGoForward) scheduleOnRN(change, 1);
        offset.set(withSpring(0, { damping: 20, stiffness: 260 }));
      });
  }, [canGoForward, goTo, offset, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
