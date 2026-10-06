import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, PAD } from '@/theme';

/** El botón flotante para anotar un gasto, siempre a mano sobre la barra de abajo. */
export function Fab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <PressableScale
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Anotar gasto"
      style={[styles.fab, { bottom: 74 + insets.bottom }]}
    >
      <Icon name="plus" size={26} color={colors.white} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: PAD,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 22px rgba(21,34,32,0.28)',
  },
});
