/**
 * Push notifications (free): Expo Push Service.
 * The server sends a push for every in-app notification (see supabase/migrations/*_push.sql);
 * the app only registers this device's Expo push token and handles taps.
 *
 * Limits worth knowing:
 *  - Web: not supported here.
 *  - Expo Go on Android: no remote push since SDK 53 (local notifications still work);
 *    use a development build (EAS Build, free tier) to receive pushes on Android.
 *  - A push token needs an EAS project id (run `npx eas-cli@latest init` once).
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/theme';

export const pushSupported = Platform.OS !== 'web';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** The token registered for the signed-in user on this device (removed again on sign out). */
let registeredToken: string | null = null;
export const getRegisteredToken = () => registeredToken;
export const setRegisteredToken = (token: string | null) => {
  registeredToken = token;
};

/** Show notifications while the app is open, and create the Android channel. */
export function configureNotifications() {
  if (!pushSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'שוקי',
      importance: AndroidImportance.HIGH,
      lightColor: colors.tomato,
    }).catch(() => {});
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermissionState(): Promise<PermissionState> {
  if (!pushSupported) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/** Asks once (the OS remembers the answer). Returns whether notifications are allowed. */
export async function ensurePermission(): Promise<boolean> {
  if (!pushSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}

/** This device's Expo push token, or null when pushes can't work here. */
export async function getPushToken(): Promise<string | null> {
  if (!pushSupported || !Device.isDevice) return null;
  if (Platform.OS === 'android' && isExpoGo) return null;
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;
  if (!(await ensurePermission())) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** A notification shown right away by the phone itself (used by demo mode). */
export async function showLocalNotification(title: string, body: string, href?: string) {
  if (!pushSupported) return;
  if (!(await ensurePermission())) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body, data: { href } }, trigger: null });
}
