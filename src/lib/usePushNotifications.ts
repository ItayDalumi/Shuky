import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import * as api from '@/lib/api';
import { configureNotifications, ensurePermission, getPushToken, pushSupported, setRegisteredToken } from '@/lib/push';
import { useAppStore } from '@/store/AppStore';

function hrefOf(response: Notifications.NotificationResponse | null | undefined): Href | null {
  const href = response?.notification.request.content.data?.href;
  return typeof href === 'string' && href.startsWith('/') ? (href as Href) : null;
}

/**
 * Inside the signed-in area: register this device for pushes (live) or ask for permission
 * (demo, for local notifications), refresh the list when one arrives, and open its screen on tap.
 */
export function usePushNotifications() {
  const { mode, authStatus, user, refreshNotifications } = useAppStore();
  const ready = authStatus === 'ready';

  useEffect(() => {
    if (!pushSupported || !ready) return;
    configureNotifications();
    if (mode === 'demo') {
      ensurePermission().catch(() => {});
      return;
    }
    let cancelled = false;
    getPushToken()
      .then(async (token) => {
        if (!token || cancelled) return;
        await api.registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
        setRegisteredToken(token);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode, ready, user.id]);

  useEffect(() => {
    if (!pushSupported || !ready) return;
    // Opened from a notification while the app was closed.
    const last = hrefOf(Notifications.getLastNotificationResponse());
    if (last) router.push(last);

    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      const href = hrefOf(response);
      if (href) router.push(href);
    });
    const received = Notifications.addNotificationReceivedListener(() => {
      refreshNotifications().catch(() => {});
    });
    return () => {
      tapped.remove();
      received.remove();
    };
  }, [ready, refreshNotifications]);
}
