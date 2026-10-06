import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Logo } from '@/components/brand/Logo';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { colors, fonts, HEADER_CONTENT_HEIGHT, PAD } from '@/theme';

/** Alto total del encabezado, contando la zona del notch / Dynamic Island. */
export const useHeaderHeight = () => useSafeAreaInsets().top + HEADER_CONTENT_HEIGHT;

/** Encabezado fijo: el contenido pasa por debajo y se funde con el fondo (como el sticky de la web). */
export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
      <IconButton icon="gear" onPress={onOpenSettings} accessibilityLabel="Ajustes" />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
