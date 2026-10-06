import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { currentMonth, monthTitle, shiftMonth } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { useAppState } from '@/state/AppStateProvider';
import { useAppActions } from '@/state/useAppActions';
import { fonts, makeStyles } from '@/theme';

/**
 * "‹ Octubre de 2026 ›" con el atajo "Hoy" cuando se está mirando otro mes. Con VoiceOver, el
 * título es ajustable: deslizar hacia arriba o abajo cambia de mes.
 */
export function MonthBar() {
  const styles = useStyles();
  const { ui } = useAppState();
  const actions = useAppActions();
  const now = currentMonth();
  const canGoForward = shiftMonth(ui.month, 1) <= now;
  const go = (delta: number) => {
    if (delta > 0 && !canGoForward) return;
    haptics.selection();
    actions.shiftMonth(delta);
  };
  return (
    <View style={styles.bar}>
      <IconButton icon="left" size={34} iconSize={19} onPress={() => go(-1)} accessibilityLabel="Mes anterior" />
      <AppText
        style={styles.title}
        accessibilityRole="adjustable"
        accessibilityLabel="Mes"
        accessibilityValue={{ text: monthTitle(ui.month) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        {monthTitle(ui.month)}
      </AppText>
      <IconButton
        icon="right"
        size={34}
        iconSize={19}
        disabled={!canGoForward}
        onPress={() => go(1)}
        accessibilityLabel="Mes siguiente"
      />
      {ui.month !== now ? (
        <Pressable
          onPress={() => {
            haptics.selection();
            actions.goToMonth(now);
          }}
          accessibilityRole="button"
          accessibilityLabel="Volver al mes actual"
          style={({ pressed }) => [styles.today, pressed && styles.todayPressed]}
        >
          <AppText style={styles.todayText}>Hoy</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    paddingBottom: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 17,
    lineHeight: 24.65,
    minWidth: 168,
    textAlign: 'center',
    letterSpacing: -0.17,
  },
  // en la misma fila (no flotando a la derecha): en pantallas de 375 pt pisaba la flecha
  today: {
    marginLeft: 4,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: c.ghost,
    justifyContent: 'center',
  },
  todayPressed: { backgroundColor: c.ghostPressed },
  todayText: { fontSize: 12.5, fontWeight: '600', color: c.ink2 },
}));
