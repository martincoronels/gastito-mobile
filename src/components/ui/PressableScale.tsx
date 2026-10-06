import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Estilo extra mientras está apretado */
  pressedStyle?: StyleProp<ViewStyle>;
  /** Cuánto se achica al apretarlo (el :active { transform: scale() } de la web) */
  scaleTo?: number;
};

export function PressableScale({
  scaleTo = 0.96,
  style,
  pressedStyle,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        if (!reduceMotion) scale.set(withTiming(scaleTo, { duration: 120 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.set(withTiming(1, { duration: 180 }));
        onPressOut?.(e);
      }}
      style={[style, pressed && pressedStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
