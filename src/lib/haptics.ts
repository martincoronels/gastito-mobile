import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Vibraciones sutiles (Taptic Engine), siempre con el mismo significado en toda la app. Si la
 * persona apagó las vibraciones del sistema en Ajustes de iOS, no suenan.
 */
const run = (feedback: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  feedback().catch(() => {});
};

export const haptics = {
  /** Cambiar de opción: pestaña, categoría, mes, porción de la dona */
  selection: () => run(() => Haptics.selectionAsync()),
  /** Un toque liviano: pausar un fijo, cruzar el umbral de un deslizamiento */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Algo salió bien: gasto anotado, fijos registrados */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Atención: se borró algo, se pasó del presupuesto */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** No se pudo: monto inválido, desbloqueo fallido */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
