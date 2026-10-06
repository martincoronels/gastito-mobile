import { GlassSurface, liquidGlass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { makeStyles, PAD, TAB_BAR, useTheme } from '@/theme';
import { useTabBarFrame } from './BottomNav';

/**
 * El botón para anotar un gasto, al lado de la barra de pestañas y siempre a mano. En iOS 26 es
 * un botón de vidrio teñido (el "destacado" de Liquid Glass).
 */
export function Fab({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { bottom } = useTabBarFrame();
  return (
    <PressableScale
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Anotar gasto"
      style={[styles.fab, { bottom }]}
    >
      <GlassSurface style={styles.surface} tint={colors.accent} interactive>
        <Icon name="plus" size={26} color={colors.onAccent} strokeWidth={2.1} />
      </GlassSurface>
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  fab: {
    position: 'absolute',
    right: PAD,
    width: TAB_BAR.fab,
    height: TAB_BAR.fab,
    borderRadius: TAB_BAR.fab / 2,
    boxShadow: liquidGlass ? undefined : `0 8px 22px ${c.shadow}`,
  },
  surface: {
    flex: 1,
    borderRadius: TAB_BAR.fab / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
