import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/AppStore';
import { colors } from '@/theme';

/** Entry point: demo mode always starts at onboarding; live mode resumes the saved session. */
export default function Index() {
  const { mode, authStatus } = useAppStore();

  if (mode === 'demo') return <Redirect href="/welcome" />;
  if (authStatus === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.cherry} />
      </View>
    );
  }
  if (authStatus === 'ready') return <Redirect href="/home" />;
  if (authStatus === 'needsProfile') return <Redirect href="/name" />;
  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
});
