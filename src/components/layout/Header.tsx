import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Logo } from '@/components/brand/Logo';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface, liquidGlass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { fonts, HEADER_CONTENT_HEIGHT, makeStyles, PAD, useTheme } from '@/theme';

/** Alto total del encabezado, contando la zona del notch / Dynamic Island. */
export const useHeaderHeight = () => useSafeAreaInsets().top + HEADER_CONTENT_HEIGHT;

/** Encabezado fijo: el contenido pasa por debajo y se funde con el fondo (como el sticky de la web). */
export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useStyles();
  const height = insets.top + HEADER_CONTENT_HEIGHT;
  return (
    <View style={[styles.root, { height, paddingTop: insets.top + 14 }]}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <LinearGradient id="headerFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.canvas} stopOpacity={1} />
            <Stop offset="0.72" stopColor={colors.canvas} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.canvas} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#headerFade)" />
      </Svg>
      <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="Gastito">
        <Logo size={24} />
        <AppText style={styles.brandText}>Gastito</AppText>
      </View>
      {liquidGlass ? (
        // en iOS 26, los botones de arriba son círculos de vidrio
        <GlassSurface style={styles.glassButton} interactive>
          <IconButton icon="gear" onPress={onOpenSettings} accessibilityLabel="Ajustes" />
        </GlassSurface>
      ) : (
        <IconButton icon="gear" onPress={onOpenSettings} accessibilityLabel="Ajustes" />
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: PAD,
    paddingBottom: 6,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginRight: 'auto' },
  brandText: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 30.4, letterSpacing: -0.63 },
  glassButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
}));
