import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BottomNav, useTabBarFrame } from '@/components/layout/BottomNav';
import { Fab } from '@/components/layout/Fab';
import { Header, useHeaderHeight } from '@/components/layout/Header';
import { FixedView } from '@/features/fixed/FixedView';
import { MovementsView } from '@/features/movements/MovementsView';
import { SheetHost } from '@/features/sheets/SheetHost';
import { SummaryView } from '@/features/summary/SummaryView';
import { useAppState } from '@/state/AppStateProvider';
import { useLock } from '@/state/LockProvider';
import { useIncomingLinks } from '@/state/useIncomingLinks';
import { useReminderSync } from '@/state/useReminderSync';
import { useSheet } from '@/state/SheetProvider';
import { useAppActions } from '@/state/useAppActions';
import { makeStyles, PAD } from '@/theme';

/** La única pantalla: encabezado, la sección activa, la barra de abajo, el botón + y las hojas. */
export function HomeScreen() {
  const styles = useStyles();
  const { ui } = useAppState();
  const actions = useAppActions();
  const sheet = useSheet();
  const headerHeight = useHeaderHeight();
  const { contentInset } = useTabBarFrame();
  const reduceMotion = useReducedMotion();
  const scroll = useRef<ScrollView>(null);
  const previousView = useRef(ui.view);
  const enter = useSharedValue(1);

  const { locked } = useLock();
  useReminderSync();
  // lo que llegue bloqueado (un link, el toque en un aviso) se atiende al desbloquear
  useIncomingLinks(!locked);

  // cada toque en una pestaña vuelve arriba de todo; si cambió la sección, entra con un fundido
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (previousView.current !== ui.view && !reduceMotion) {
      enter.set(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 320, easing: Easing.bezier(0.2, 0.8, 0.25, 1) }),
        ),
      );
    }
    previousView.current = ui.view;
  }, [ui.tabKey, ui.view, reduceMotion, enter]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.get(),
    transform: [{ translateY: (1 - enter.get()) * 9 }],
  }));

  return (
    <View
      style={styles.root}
      // con la app bloqueada, VoiceOver tampoco llega a lo que está debajo
      accessibilityElementsHidden={locked}
      importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
    >
      <ScrollView
        ref={scroll}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingTop: headerHeight, paddingBottom: contentInset }]}
        scrollIndicatorInsets={{ top: headerHeight - 10, bottom: contentInset - 24 }}
      >
        <Animated.View style={enterStyle}>
          {ui.view === 'resumen' ? <SummaryView /> : ui.view === 'movimientos' ? <MovementsView /> : <FixedView />}
        </Animated.View>
      </ScrollView>
      <Header onOpenSettings={sheet.openSettings} />
      <BottomNav current={ui.view} onChange={actions.setView} />
      <Fab onPress={() => sheet.openExpense()} />
      <SheetHost />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.canvas },
  content: { paddingHorizontal: PAD },
}));
