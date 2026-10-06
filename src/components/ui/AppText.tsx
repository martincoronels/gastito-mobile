import { Text, type TextProps } from 'react-native';

import { makeStyles } from '@/theme';

/**
 * Text con los valores base de la app. Respeta el tamaño de letra que elija la persona en
 * Ajustes de iOS, pero con un tope para que el diseño no se desarme.
 */
export function AppText({ style, maxFontSizeMultiplier = 1.4, ...rest }: TextProps) {
  const styles = useStyles();
  return <Text {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier} style={[styles.base, style]} />;
}

const useStyles = makeStyles((c) => ({
  base: { color: c.ink, fontSize: 15 },
}));
