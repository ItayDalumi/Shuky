import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { TURNSTILE_BASE_URL, TURNSTILE_SCRIPT, TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { colors } from '@/theme';
import { AppText } from './AppText';

export type CaptchaProps = {
  /** Called with a fresh token, or '' when it expires */
  onToken: (token: string) => void;
};

const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;background:transparent;display:flex;justify-content:center}</style>
<script src="${TURNSTILE_SCRIPT}?onload=onTurnstileLoad" async defer></script>
</head><body><div id="captcha"></div><script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
window.onTurnstileLoad=function(){turnstile.render('#captcha',{
  sitekey:${JSON.stringify(TURNSTILE_SITE_KEY)},language:'he',
  callback:function(t){send({token:t});},
  'expired-callback':function(){send({token:''});},
  'error-callback':function(){send({error:true});}
});};
setTimeout(function(){if(!window.turnstile)send({error:true});},12000);
</script></body></html>`;

/** Cloudflare Turnstile inside a small WebView (iOS / Android). */
export function Captcha({ onToken }: CaptchaProps) {
  const [failed, setFailed] = useState(false);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { token?: string; error?: boolean };
      if (msg.error) setFailed(true);
      else onToken(msg.token ?? '');
    } catch {
      // ignore unrelated messages
    }
  };

  return (
    <View style={styles.box} accessibilityLabel="בדיקת אבטחה">
      <WebView
        source={{ html, baseUrl: TURNSTILE_BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        scrollEnabled={false}
        style={styles.web}
      />
      {failed ? (
        <AppText variant="caption" color={colors.tomatoDark} center>
          לא הצלחנו לטעון את בדיקת האבטחה. בדקו את החיבור ונסו שוב.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 4 },
  web: { height: 70, backgroundColor: 'transparent' },
});
