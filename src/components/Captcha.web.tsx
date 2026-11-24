import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TURNSTILE_SCRIPT, TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { colors } from '@/theme';
import { AppText } from './AppText';
import type { CaptchaProps } from './Captcha';

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${TURNSTILE_SCRIPT}?render=explicit`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Cloudflare Turnstile rendered directly in the page (web). */
export function Captcha({ onToken }: CaptchaProps) {
  const [failed, setFailed] = useState(false);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        const el = document.getElementById('shuky-captcha');
        if (cancelled || !el || !window.turnstile) return;
        widgetId = window.turnstile.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'he',
          callback: (t: string) => onTokenRef.current(t),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => setFailed(true),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, []);

  return (
    <View style={styles.box} accessibilityLabel="בדיקת אבטחה">
      <View nativeID="shuky-captcha" style={styles.widget} />
      {failed ? (
        <AppText variant="caption" color={colors.tomatoDark} center>
          לא הצלחנו לטעון את בדיקת האבטחה. בדקו את החיבור ונסו שוב.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4, alignItems: 'center' },
  widget: { minHeight: 65 },
});
