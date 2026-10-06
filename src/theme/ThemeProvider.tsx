import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Appearance, StyleSheet, useColorScheme } from 'react-native';

import type { AppearancePreference } from '@/domain/preferences';
import { lightColors, paletteFor, type ColorScheme, type Palette } from './colors';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  /** Ajustes de iOS → Accesibilidad → Aumentar contraste */
  highContrast: boolean;
  /** Identifica la combinación (para cachear estilos) */
  key: string;
}

const ThemeContext = createContext<Theme>({ scheme: 'light', colors: lightColors, highContrast: false, key: 'light' });

export const useTheme = () => useContext(ThemeContext);

/**
 * Tema claro u oscuro según iOS (o lo elegido en Ajustes). Además fija la apariencia de la app
 * entera, así los controles nativos (teclado, calendario, alertas) acompañan.
 */
export function ThemeProvider({ appearance, children }: { appearance: AppearancePreference; children: ReactNode }) {
  const system = useColorScheme();
  const highContrast = useIncreaseContrast();

  useEffect(() => {
    try {
      Appearance.setColorScheme?.(appearance === 'system' ? 'unspecified' : appearance);
    } catch {
      // en algunas plataformas no se puede forzar: se usa la del sistema
    }
  }, [appearance]);

  const scheme: ColorScheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: paletteFor(scheme, highContrast),
      highContrast,
      key: `${scheme}${highContrast ? '-hc' : ''}`,
    }),
    [scheme, highContrast],
  );

  // el fondo de la ventana (se ve un instante al rotar o mientras sube el teclado)
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.canvas).catch(() => {});
  }, [theme.colors.canvas]);

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

function useIncreaseContrast(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isDarkerSystemColorsEnabled?.()
      .then((value) => active && setEnabled(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('darkerSystemColorsChanged', (value) => setEnabled(Boolean(value)));
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

/**
 * Estilos que dependen del tema. Se arman una vez por combinación (claro, oscuro, con más
 * contraste) y se reutilizan: es como StyleSheet.create, pero con los colores del momento.
 *
 * const useStyles = makeStyles((c) => ({ card: { backgroundColor: c.surface } }));
 * …dentro del componente: const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (colors: Palette, theme: Theme) => T) {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme.key);
    if (!styles) {
      styles = StyleSheet.create(factory(theme.colors, theme));
      cache.set(theme.key, styles);
    }
    return styles;
  };
}
