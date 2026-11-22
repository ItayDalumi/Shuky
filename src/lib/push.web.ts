/** Web: no push notifications (keeps expo-notifications out of the web bundle). Same API as push.ts. */
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const pushSupported = false;
export const getRegisteredToken = (): string | null => null;
export const setRegisteredToken = (_token: string | null) => {};
export function configureNotifications() {}
export async function getPermissionState(): Promise<PermissionState> {
  return 'unsupported';
}
export async function ensurePermission(): Promise<boolean> {
  return false;
}
export async function getPushToken(): Promise<string | null> {
  return null;
}
export async function showLocalNotification(_title: string, _body: string, _href?: string) {}
