import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Bell, CakeSlice, Lock, LogOut, MapPin, Phone, Star, Trash2, type LucideIcon } from 'lucide-react-native';

import { AppText, Input, Screen, ScreenHeader } from '@/components';
import type { NotificationPrefs } from '@/data/types';
import { confirmAction } from '@/lib/confirm';
import { errorMessage } from '@/lib/api';
import { resetToWelcome } from '@/lib/navigation';
import { ltr } from '@/lib/rtl';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; icon: LucideIcon; label: string; hint: string }[] = [
  { key: 'newListings', icon: CakeSlice, label: 'מאפים חדשים בשכונה', hint: 'כשאופה מהשכונה מעלה מוצר חדש' },
  { key: 'orders', icon: Bell, label: 'הזמנות ועסקאות', hint: 'אישורי עסקה ותזכורות להזמנות מראש' },
  { key: 'ratings', icon: Star, label: 'דירוגים ורמות', hint: 'כשמדרגים אותך או כשעולים רמה' },
];

/** הגדרות. In live mode the name, sign out and delete account go to Supabase; toggles are still local (Phase 3). */
export default function SettingsScreen() {
  const { user, updateUser, signOut, deleteAccount, notificationPrefs, setNotificationPref } = useAppStore();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState<string | null>(null);

  const saveName = async () => {
    const trimmed = name.trim();
    if (trimmed === user.name) return;
    if (trimmed.length < 2) return setName(user.name);
    try {
      setError(null);
      await updateUser({ name: trimmed });
    } catch (e) {
      setError(errorMessage(e));
      setName(user.name);
    }
  };

  const run = async (action: () => Promise<void>) => {
    try {
      setError(null);
      await action();
      resetToWelcome(router);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onSignOut = () =>
    confirmAction({
      title: 'להתנתק מהחשבון?',
      message: 'אפשר להתחבר שוב בכל רגע עם מספר הטלפון שלך.',
      confirmLabel: 'התנתקות',
      onConfirm: () => run(signOut),
    });

  const onDeleteAccount = () =>
    confirmAction({
      title: 'למחוק את החשבון?',
      message: 'כל המוצרים, הדירוגים והנקודות שלך יימחקו לצמיתות. אי אפשר לבטל את הפעולה.',
      confirmLabel: 'מחיקה',
      destructive: true,
      // Live: removes photos, then delete_my_account() deletes the user (data cascades).
      onConfirm: () => run(deleteAccount),
    });

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="הגדרות" fallback="/profile" />
          {error ? (
            <AppText variant="small" color={colors.tomatoDark}>
              {error}
            </AppText>
          ) : null}

          <Section title="הפרופיל שלי">
            <View style={styles.padded}>
              <Input
                label="שם"
                value={name}
                onChangeText={setName}
                onBlur={saveName}
                onSubmitEditing={saveName}
                maxLength={30}
                returnKeyType="done"
                autoComplete="name"
              />
            </View>
            <Row icon={MapPin} label="יישוב" value={user.community} hint="כרגע שוקי פעיל רק בלהבים" />
            <Row icon={Phone} label="טלפון" value={ltr(user.phone)} last />
          </Section>

          <Section title="התראות">
            {NOTIFICATION_ROWS.map((row, i) => (
              <Row
                key={row.key}
                icon={row.icon}
                label={row.label}
                hint={row.hint}
                last={i === NOTIFICATION_ROWS.length - 1}
                trailing={
                  <Switch
                    accessibilityLabel={row.label}
                    value={notificationPrefs[row.key]}
                    onValueChange={(v) => setNotificationPref(row.key, v)}
                    trackColor={{ false: colors.line, true: colors.tomato }}
                    thumbColor={colors.white}
                    ios_backgroundColor={colors.line}
                    // react-native-web colors the "on" thumb separately (teal by default).
                    {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : null)}
                  />
                }
              />
            ))}
          </Section>

          <Section title="פרטיות">
            <Row
              icon={Lock}
              iconColor={colors.leaf}
              label="המיקום שלך מוגן"
              hint="השכנים רואים רק מרחק משוער, אף פעם לא את הכתובת שלך."
              last
            />
          </Section>

          <Section title="חשבון">
            <Row icon={LogOut} label="התנתקות" onPress={onSignOut} />
            <Row icon={Trash2} label="מחיקת חשבון" danger onPress={onDeleteAccount} last />
          </Section>

          <AppText variant="caption" color={colors.muted} center>
            {`שוקי · גרסה ${ltr(version)}`}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color={colors.muted} style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

type RowProps = {
  icon: LucideIcon;
  label: string;
  value?: string;
  hint?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  iconColor?: string;
  last?: boolean;
};

function Row({ icon: Icon, label, value, hint, trailing, onPress, danger, iconColor, last }: RowProps) {
  const labelColor = danger ? colors.tomatoDark : colors.ink;
  const content = (
    <>
      <Icon size={20} color={danger ? colors.tomatoDark : (iconColor ?? colors.muted)} strokeWidth={2} />
      <View style={styles.rowTexts}>
        <AppText variant="bodyMedium" color={labelColor}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color={colors.muted}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="body" color={colors.muted}>
          {value}
        </AppText>
      ) : null}
      {trailing}
    </>
  );

  const style = [styles.row, last ? null : styles.rowDivider];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, pressed ? { backgroundColor: colors.cream } : null]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  section: { gap: spacing.xs },
  sectionTitle: { paddingHorizontal: spacing.xxs },
  card: {
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  padded: { padding: spacing.md, paddingBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowDivider: { borderBottomWidth: border.hairline, borderBottomColor: colors.line },
  rowTexts: { flex: 1, alignItems: 'flex-start', gap: 2 },
});
