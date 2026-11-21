import { Alert, Platform } from 'react-native';

/** Native confirm dialog (Alert on iOS/Android, window.confirm on web where Alert is a no-op). */
export function confirmAction(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`)) opts.onConfirm();
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: 'ביטול', style: 'cancel' },
    { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: opts.onConfirm },
  ]);
}
