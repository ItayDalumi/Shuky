import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText, Button, Input, Screen, StepHeader } from '@/components';
import { errorMessage } from '@/lib/api';
import { formatPhoneInput, isValidIsraeliMobile } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

/** New users pick the name neighbors see and the WhatsApp number they order through (creates the profile). */
export default function NameScreen() {
  const { createProfile } = useAppStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length >= 2 && isValidIsraeliMobile(phone);

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createProfile(name, phone);
      router.replace('/location');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <StepHeader
            title="נעים להכיר!"
            subtitle="השם הוא מה שהשכנים יראו. דרך הוואטסאפ הם יזמינו ממך."
            hideBack
          />

          <Input
            label="שם"
            placeholder="למשל: דנה כהן"
            value={name}
            onChangeText={setName}
            maxLength={30}
            autoFocus
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            containerStyle={styles.input}
          />
          <Input
            label="מספר וואטסאפ"
            placeholder="050-123-4567"
            value={phone}
            onChangeText={(t) => setPhone(formatPhoneInput(t))}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            ltrValue
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {error ? (
            <AppText variant="small" color={colors.cherryDark}>
              {error}
            </AppText>
          ) : null}

          <View style={styles.spacer} />

          <Button label="המשך" onPress={submit} disabled={!valid} loading={saving} />
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
