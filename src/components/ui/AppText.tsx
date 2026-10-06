import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors } from '@/theme';

/**
 * Text con los valores base de la app. Respeta el tamaño de letra que elija la persona en
 * Ajustes de iOS, pero con un tope para que el diseño no se desarme.
 */
export function AppText({ style, maxFontSizeMultiplier = 1.4, ...rest }: TextProps) {
  return <Text {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: { color: colors.ink, fontSize: 15 },
});
