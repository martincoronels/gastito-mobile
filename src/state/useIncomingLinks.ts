import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';

import { parseAppLink, type AppLink } from '@/domain/links';
import { readResponse, type ReminderResponse } from '@/services/notifications';
import { useSheet } from './SheetProvider';
import { useAppActions } from './useAppActions';
import { useCategories } from './useCategories';

type Incoming = { type: 'url'; url: string } | { type: 'notification'; response: ReminderResponse };

/**
 * Atiende lo que abre la app desde afuera: links gastito://… (por ejemplo, desde un atajo) y los
 * toques en las notificaciones. Mientras `enabled` es false (la app está bloqueada), lo que llegue
 * queda en espera y se atiende al desbloquear.
 */
export function useIncomingLinks(enabled: boolean) {
  const actions = useAppActions();
  const sheet = useSheet();
  const categories = useCategories();
  const queue = useRef<Incoming[]>([]);
  const handlerRef = useRef<(item: Incoming) => void>(() => {});
  const enabledRef = useRef(enabled);

  const open = useCallback(
    (link: AppLink) => {
      if (link.kind === 'settings') {
        sheet.openSettings();
        return;
      }
      if (link.kind === 'new-expense') {
        sheet.openExpense(null, link.prefill);
        return;
      }
      sheet.close();
      actions.setView(link.view, link.month);
    },
    [actions, sheet],
  );

  useEffect(() => {
    handlerRef.current = (item) => {
      if (item.type === 'url') {
        const link = parseAppLink(item.url, categories);
        if (link) open(link);
        return;
      }
      const { register, url, month } = item.response;
      if (register && month) {
        actions.applyFixedIn(month);
        sheet.close();
        actions.setView('fijos', month);
        return;
      }
      const link = url ? parseAppLink(url, categories) : null;
      if (link) open(link);
    };
  }, [actions, categories, open, sheet]);

  const receive = useCallback((item: Incoming) => {
    if (enabledRef.current) handlerRef.current(item);
    else queue.current.push(item);
  }, []);

  // al desbloquear, se atiende lo que llegó mientras tanto, en orden
  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled || !queue.current.length) return;
    const pending = queue.current;
    queue.current = [];
    pending.forEach((item) => handlerRef.current(item));
  }, [enabled]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // lo que abrió la app (si estaba cerrada)
    void Linking.getInitialURL()
      .then((url) => {
        if (url) receive({ type: 'url', url });
      })
      .catch(() => {});
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        receive({ type: 'notification', response: readResponse(last) });
        Notifications.clearLastNotificationResponse();
      }
    } catch {
      // sin módulo de notificaciones (por ejemplo, en la web)
    }

    const urlSub = Linking.addEventListener('url', ({ url }) => receive({ type: 'url', url }));
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      receive({ type: 'notification', response: readResponse(response) });
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        // nada
      }
    });
    return () => {
      urlSub.remove();
      responseSub.remove();
    };
  }, [receive]);
}
