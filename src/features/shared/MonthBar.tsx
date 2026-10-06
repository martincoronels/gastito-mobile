import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { currentMonth, monthTitle, shiftMonth } from '@/lib/dates';
import { useAppState } from '@/state/AppStateProvider';
import { useAppActions } from '@/state/useAppActions';
import { colors, fonts } from '@/theme';

/** "‹ Octubre de 2026 ›" con el atajo "Hoy" cuando se está mirando otro mes. */
export function MonthBar() {
  const { ui } = useAppState();
  const actions = useAppActions();
  const now = currentMonth();
  const canGoForward = shiftMonth(ui.month, 1) <= now;
  return (
    <View style={styles.bar}>
      <IconButton
        icon="left"
        size={34}
        iconSize={19}
        onPress={() => actions.shiftMonth(-1)}
        accessibilityLabel="Mes anterior"
      />
      <AppText style={styles.title} accessibilityRole="header">
        {monthTitle(ui.month)}
      </AppText>
      <IconButton
        icon="right"
        size={34}
        iconSize={19}
        disabled={!canGoForward}
        onPress={() => actions.shiftMonth(1)}
        accessibilityLabel="Mes siguiente"
      />
      {ui.month !== now ? (
        <Pressable
          onPress={() => actions.goToMonth(now)}
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

const styles = StyleSheet.create({
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
  today: {
    position: 'absolute',
    right: 0,
    top: 8,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.ghost,
    justifyContent: 'center',
  },
  todayPressed: { backgroundColor: colors.ghostPressed },
  todayText: { fontSize: 12.5, fontWeight: '600', color: colors.ink2 },
});
