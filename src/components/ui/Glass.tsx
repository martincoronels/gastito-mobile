import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

/**
 * Liquid Glass (iOS 26 en adelante, con la app compilada con el SDK de iOS 26). Se consulta una
 * sola vez; si el módulo no está (por ejemplo, una versión vieja de Expo Go), no se usa.
 */
export const liquidGlass: boolean = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

/** Ajustes de iOS → Accesibilidad → Reducir transparencia */
export function useReduceTransparency(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((value) => active && setEnabled(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => setEnabled(Boolean(value)));
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return enabled;
}

interface GlassSurfaceProps {
  style?: StyleProp<ViewStyle>;
  /** Vidrio teñido (para el botón principal) */
  tint?: string;
  /** El vidrio reacciona al tocarlo, como los controles de iOS 26 */
  interactive?: boolean;
  children?: ReactNode;
}

/**
 * Una superficie flotante: Liquid Glass donde existe; en iOS anteriores, un desenfoque con un velo
 * del color de la app; y si se pidió reducir la transparencia, un fondo sólido.
 */
export function GlassSurface({ style, tint, interactive = false, children }: GlassSurfaceProps) {
  const { scheme } = useTheme();
  const styles = useStyles();
  const reduceTransparency = useReduceTransparency();

  if (liquidGlass && !reduceTransparency) {
    return (
      <GlassView
        style={style}
        glassEffectStyle="regular"
        tintColor={tint}
        isInteractive={interactive}
        colorScheme={scheme}
      >
        {children}
      </GlassView>
    );
  }
  if (tint) return <View style={[style, { backgroundColor: tint }]}>{children}</View>;
  return (
    <View style={[style, styles.fallback, reduceTransparency && styles.solid]}>
      {reduceTransparency ? null : (
        <>
          <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.veil]} />
        </>
      )}
      {children}
    </View>
  );
}

const useStyles = makeStyles((c, t) => ({
  fallback: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(21,34,32,0.08)',
  },
  veil: { backgroundColor: c.navGlass },
  solid: { backgroundColor: c.surface },
}));
