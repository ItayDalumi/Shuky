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

import { AppText } from '@/components';
import { setupRTL, webDir } from '@/lib/rtl';
import { isSupabaseConfigured } from '@/lib/supabase';
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

  // Never ship the demo: mock sellers, listings and ratings must not look real to users.
  // Development builds (and EXPO_PUBLIC_ALLOW_DEMO=1 previews) may run on mock data.
  if (!isSupabaseConfigured && !__DEV__ && process.env.EXPO_PUBLIC_ALLOW_DEMO !== '1') {
    return (
      <View style={styles.notConfigured} {...webDir('rtl')}>
        <AppText variant="heading" center>
          שוקי עוד לא מחוברת לשרת
        </AppText>
        <AppText variant="body" color={colors.muted} center>
          הגרסה הזו נבנתה בלי הגדרות Supabase. נסו שוב בקרוב.
        </AppText>
      </View>
    );
  }

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
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: colors.cream,
  },
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
