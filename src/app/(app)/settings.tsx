import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import {
  Bell,
  BellOff,
  BellRing,
  CakeSlice,
  Download,
  FileText,
  LifeBuoy,
  Lock,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  Trash2,
  UserX,
  type LucideIcon,
} from 'lucide-react-native';

import { AppText, Input, Screen, ScreenHeader } from '@/components';
import type { NotificationPrefs } from '@/data/types';
import { confirmAction } from '@/lib/confirm';
import { errorMessage } from '@/lib/api';
import { formatPhoneInput, isValidIsraeliMobile } from '@/lib/format';
import { resetToWelcome } from '@/lib/navigation';
import { ensurePermission, getPermissionState, type PermissionState } from '@/lib/push';
import { ltr } from '@/lib/rtl';
import { shareJson } from '@/lib/shareData';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; icon: LucideIcon; label: string; hint: string }[] = [
  { key: 'newListings', icon: CakeSlice, label: 'מאפים חדשים בשכונה', hint: 'כשאופה מהשכונה מפרסם/ת מאפה חדש' },
  { key: 'orders', icon: Bell, label: 'הזמנות ועסקאות', hint: 'אישורי עסקה ותזכורות להזמנות מראש' },
  { key: 'ratings', icon: Star, label: 'דירוגים ורמות', hint: 'כשמדרגים אותך או כשעולים רמה' },
];

/** הגדרות. In live mode the name, sign out and delete account go to Supabase; toggles are still local (Phase 3). */
export default function SettingsScreen() {
  const { user, updateUser, signOut, deleteAccount, exportMyData, notificationPrefs, setNotificationPref } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [permission, setPermission] = useState<PermissionState>('unsupported');

  useEffect(() => {
    getPermissionState().then(setPermission).catch(() => {});
  }, []);

  const enablePush = async () => {
    if (permission === 'denied') return Linking.openSettings();
    await ensurePermission();
    setPermission(await getPermissionState());
  };
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

  const savePhone = async () => {
    if (phone === user.phone) return;
    if (!isValidIsraeliMobile(phone)) return setPhone(user.phone);
    try {
      setError(null);
      await updateUser({ phone });
    } catch (e) {
      setError(errorMessage(e));
      setPhone(user.phone);
    }
  };

  const downloadMyData = async () => {
    setExporting(true);
    setError(null);
    try {
      const date = new Date().toISOString().slice(0, 10);
      await shareJson(`shuky-my-data-${date}.json`, await exportMyData());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setExporting(false);
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
      message: 'כל המאפים, הדירוגים והנקודות שלך יימחקו לצמיתות. אי אפשר לבטל את הפעולה.',
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
            <AppText variant="small" color={colors.cherryDark}>
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
              <Input
                label="מספר וואטסאפ"
                value={phone}
                onChangeText={(t) => setPhone(formatPhoneInput(t))}
                onBlur={savePhone}
                onSubmitEditing={savePhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                ltrValue
                returnKeyType="done"
              />
            </View>
            <Row icon={MapPin} label="יישוב" value={user.community} hint="כרגע שוקי פעיל רק בלהבים" />
            <Row icon={Mail} label="מייל" value={ltr(user.email)} hint="משמש רק לקוד הכניסה" last />
          </Section>

          <Section title="התראות">
            {permission === 'denied' || permission === 'undetermined' ? (
              <Row
                icon={permission === 'denied' ? BellOff : BellRing}
                iconColor={colors.cherry}
                label={permission === 'denied' ? 'ההתראות חסומות בטלפון' : 'הפעלת התראות בטלפון'}
                hint={permission === 'denied' ? 'לחצו כדי לפתוח את הגדרות הטלפון' : 'כדי לדעת מיד על עסקאות ומאפים חדשים'}
                onPress={enablePush}
              />
            ) : null}
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
                    trackColor={{ false: colors.line, true: colors.cherry }}
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
              iconColor={colors.sage}
              label="המיקום שלך מוגן"
              hint="השכנים רואים רק מרחק משוער, אף פעם לא את הכתובת שלך."
              last
            />
          </Section>

          <Section title="מידע">
            <Row icon={LifeBuoy} label="בטיחות ועזרה" onPress={() => router.push('/safety')} />
            <Row icon={ShieldCheck} label="מדיניות פרטיות" onPress={() => router.push('/legal/privacy')} />
            <Row icon={FileText} label="תנאי שימוש" onPress={() => router.push('/legal/terms')} last />
          </Section>

          <Section title="חשבון">
            <Row icon={UserX} label="משתמשים חסומים" onPress={() => router.push('/blocked')} />
            <Row
              icon={Download}
              label={exporting ? 'מכינים את הקובץ…' : 'הורדת המידע שלי'}
              hint="כל המידע שלך בשוקי, בקובץ אחד"
              onPress={exporting ? undefined : downloadMyData}
            />
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
  const labelColor = danger ? colors.cherryDark : colors.ink;
  const content = (
    <>
      <Icon size={20} color={danger ? colors.cherryDark : (iconColor ?? colors.muted)} strokeWidth={2} />
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
        <AppText variant="body" color={colors.muted} numberOfLines={1} style={styles.rowValue}>
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
  padded: { padding: spacing.md, paddingBottom: spacing.xs, gap: spacing.sm },
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
  rowValue: { flexShrink: 1, maxWidth: '55%' },
});
