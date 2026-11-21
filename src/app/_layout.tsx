import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { LocaleProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  useFonts,
} from '@expo-google-fonts/rubik';

import { setupRTL, webDir } from '@/lib/rtl';
import { AppStoreProvider } from '@/store/AppStore';
import { colors, WEB_MAX_WIDTH } from '@/theme';

setupRTL();
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <LocaleProvider direction="rtl">
      <SafeAreaProvider>
        <AppStoreProvider>
          <StatusBar style="dark" />
          <View style={styles.outer} {...webDir('rtl')}>
            <View style={styles.column}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.cream },
                }}
              />
            </View>
          </View>
        </AppStoreProvider>
      </SafeAreaProvider>
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.cream },
  // On wide web viewports keep a phone-width column, framed by thin borders.
  column: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? WEB_MAX_WIDTH : undefined,
    alignSelf: 'center',
    ...(Platform.OS === 'web'
      ? { borderStartWidth: 1, borderEndWidth: 1, borderColor: colors.line, overflow: 'hidden' as const }
      : null),
  },
});
