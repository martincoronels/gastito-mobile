import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { makeStyles, PAD, useTheme } from '@/theme';

/** El botón flotante para anotar un gasto, siempre a mano sobre la barra de abajo. */
export function Fab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <PressableScale
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Anotar gasto"
      style={[styles.fab, { bottom: 74 + insets.bottom }]}
    >
      <Icon name="plus" size={26} color={colors.onAccent} />
    </PressableScale>
  );
}

const useStyles = makeStyles((c) => ({
  fab: {
    position: 'absolute',
    right: PAD,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 8px 22px ${c.shadow}`,
  },
}));
