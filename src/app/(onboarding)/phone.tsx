import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppText, Button, Input, Screen, StepHeader } from '@/components';
import { formatPhoneInput, isValidIsraeliMobile } from '@/lib/format';
import { colors, spacing } from '@/theme';

/** 02 · התחברות. Phase 2: supabase.auth.signInWithOtp({ phone }). */
export default function PhoneScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [phone, setPhone] = useState('');
  const valid = isValidIsraeliMobile(phone);

  const submit = () => {
    if (!valid) return;
    router.push({ pathname: '/otp', params: { phone, mode: mode ?? 'signup' } });
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <StepHeader
            title={mode === 'login' ? 'טוב לראות אותך שוב!' : 'מה מספר הטלפון שלך?'}
            subtitle="נשלח אליך קוד אימות ב-SMS. בלי סיסמאות, בלי כאב ראש."
          />

          <Input
            label="מספר טלפון"
            placeholder="050-123-4567"
            value={phone}
            onChangeText={(t) => setPhone(formatPhoneInput(t))}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            ltrValue
            autoFocus
            returnKeyType="send"
            onSubmitEditing={submit}
            containerStyle={styles.input}
          />

          <View style={styles.spacer} />

          <AppText variant="caption" color={colors.muted} center>
            בלחיצה על המשך את/ה מאשר/ת את תנאי השימוש ומדיניות הפרטיות
          </AppText>
          <Button label="שלחו לי קוד" onPress={submit} disabled={!valid} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  input: { marginTop: spacing.lg },
  spacer: { flexGrow: 1, minHeight: spacing.xl },
});
