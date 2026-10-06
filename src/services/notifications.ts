import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { PlannedReminder } from '@/domain/reminders';

/** La categoría de los avisos de fijos: trae el botón "Registrar". */
export const FIXED_CATEGORY = 'gastito.fixed';
export const REGISTER_ACTION = 'register';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Cómo se muestran los avisos con la app abierta, y el botón "Registrar" de los fijos. */
export async function configureNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  try {
    await Notifications.setNotificationCategoryAsync(FIXED_CATEGORY, [
      { identifier: REGISTER_ACTION, buttonTitle: 'Registrar', options: { opensAppToForeground: true } },
    ]);
  } catch {
    // sin el botón, el aviso igual abre la app en Fijos
  }
}

export async function getPermission(): Promise<PermissionState> {
  if (!supported) return 'unavailable';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'unavailable';
  }
}

/** Pide permiso (solo la primera vez aparece el cartel de iOS; después hay que ir a Ajustes). */
export async function requestPermission(): Promise<PermissionState> {
  if (!supported) return 'unavailable';
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Abre los ajustes de la app en iOS (para activar las notificaciones si se negaron antes). */
export const openSystemSettings = () => Linking.openSettings().catch(() => {});

/**
 * Deja programados exactamente estos avisos: borra los anteriores y programa los nuevos. Se llama
 * cada vez que cambian los datos o las preferencias, así nunca queda un aviso viejo (por ejemplo,
 * de un fijo que ya se registró o se borró).
 */
export async function syncReminders(plan: readonly PlannedReminder[]): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: reminder.kind === 'daily' ? false : 'default',
        categoryIdentifier: reminder.kind === 'fixed' ? FIXED_CATEGORY : undefined,
        interruptionLevel: reminder.kind === 'fixed' ? 'active' : 'passive',
        data: { kind: reminder.kind, month: reminder.month, url: urlFor(reminder) },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date },
    });
  }
}

export const cancelAllReminders = async () => {
  if (supported) await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
};

const urlFor = (reminder: PlannedReminder) =>
  reminder.kind === 'fixed'
    ? `gastito://fijos?mes=${reminder.month}`
    : reminder.kind === 'monthly'
      ? `gastito://resumen?mes=${reminder.month}`
      : 'gastito://anotar';

export interface ReminderResponse {
  /** Identifica esta respuesta (la misma puede llegar dos veces al abrir la app desde el aviso) */
  key: string;
  /** Se tocó "Registrar" en un aviso de fijos */
  register: boolean;
  url: string | null;
  month: string | null;
}

/** Lo que importa de una respuesta a un aviso (tocarlo o tocar uno de sus botones). */
export function readResponse(response: Notifications.NotificationResponse): ReminderResponse {
  const data = response.notification.request.content.data ?? {};
  const url = typeof data.url === 'string' ? data.url : null;
  const month = typeof data.month === 'string' && /^\d{4}-\d{2}$/.test(data.month) ? data.month : null;
  const key = `${response.notification.request.identifier ?? ''}:${response.notification.date ?? ''}:${response.actionIdentifier}`;
  return { key, register: response.actionIdentifier === REGISTER_ACTION, url, month };
}
