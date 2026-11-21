import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useAppStore } from '@/store/AppStore';
import { colors } from '@/theme';

/** Everything inside (app) requires a signed-in user with a profile (live mode). */
export default function AppLayout() {
  const { authStatus } = useAppStore();

  if (authStatus === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.tomato} />
      </View>
    );
  }
  if (authStatus === 'signedOut') return <Redirect href="/welcome" />;
  if (authStatus === 'needsProfile') return <Redirect href="/name" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen name="listing/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="trade/[id]" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
});
