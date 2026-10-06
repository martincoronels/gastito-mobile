import * as Haptics from 'expo-haptics';
import type { Ref } from 'react';
import { TextInput, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { nextAmountInput } from '@/lib/amountInput';
import { clamp } from '@/lib/math';
import { fonts, makeStyles, useTheme } from '@/theme';

/** Ancho del "0" de Bricolage 800 en tamaño óptico grande, en em: el max-width: 9ch de la web. */
const CH = 0.639;

interface AmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  ref?: Ref<TextInput>;
}

/** El monto grande del formulario: solo números, con puntos de miles, y rebota si entra otra cosa. */
export function AmountField({ value, onChange, ref }: AmountFieldProps) {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const fontSize = clamp(width * 0.12, 38, 52);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const bounce = () => {
    const step = (to: number, duration: number) => withTiming(to, { duration, easing: Easing.ease });
    shake.set(withSequence(step(-7, 66), step(6, 99), step(-2, 75), step(0, 60)));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleChange = (next: string) => {
    const edit = nextAmountInput(value, next);
    if (edit.ok) onChange(edit.value);
    else bounce();
  };

  return (
    <Animated.View style={[styles.row, shakeStyle]}>
      <AppText style={styles.currency} maxFontSizeMultiplier={1}>
        $
      </AppText>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={handleChange}
        keyboardType="decimal-pad"
        keyboardAppearance={scheme}
        placeholder="0"
        placeholderTextColor={colors.amountPlaceholder}
        selectionColor={colors.ink}
        autoComplete="off"
        autoCorrect={false}
        maxFontSizeMultiplier={1}
        accessibilityLabel="Monto"
        style={[
          styles.input,
          {
            fontSize,
            width: Math.round(9 * CH * fontSize),
            height: Math.round(fontSize * 1.49),
            letterSpacing: -0.045 * fontSize,
          },
        ]}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 18,
  },
  currency: { fontFamily: fonts.display, fontSize: 26, lineHeight: 37.7, color: c.ink3 },
  input: { fontFamily: fonts.displayHuge, color: c.ink, textAlign: 'center', padding: 0 },
}));
