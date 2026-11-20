import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';

import {
  AppText,
  Button,
  Chip,
  IconButton,
  Input,
  Screen,
  SegmentedControl,
  SelectSheet,
} from '@/components';
import { CATEGORIES, CATEGORY_ORDER } from '@/data/categories';
import type { Category, DealType } from '@/data/types';
import { DEAL_TYPE_LABELS, relativeDay } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

const DEAL_TYPES: DealType[] = ['sale', 'trade', 'free'];
const FRESH_OPTIONS = ['0', '1', '2', '3'] as const;
type FreshKey = (typeof FRESH_OPTIONS)[number];

/** 07 · הוספת מוצר. Phase 2: upload the photo to Supabase Storage and insert into `listings`. */
export default function NewListingScreen() {
  const { addListing } = useAppStore();

  const [photoUri, setPhotoUri] = useState<string>();
  const [category, setCategory] = useState<Category>('baked');
  const [title, setTitle] = useState('');
  const [dealType, setDealType] = useState<DealType>('sale');
  const [price, setPrice] = useState('');
  const [freshDays, setFreshDays] = useState<FreshKey>('0');
  const [description, setDescription] = useState('');
  const [freshSheetOpen, setFreshSheetOpen] = useState(false);

  const freshVerb = CATEGORIES[category].freshVerb;
  const priceNumber = Number(price);
  const canPublish = title.trim().length > 1 && (dealType !== 'sale' || priceNumber > 0);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const publish = () => {
    if (!canPublish) return;
    const freshAt = new Date();
    freshAt.setDate(freshAt.getDate() - Number(freshDays));
    const listing = addListing({
      title: title.trim(),
      category,
      dealType,
      price: dealType === 'sale' ? priceNumber : undefined,
      description: description.trim(),
      freshAt: freshAt.toISOString(),
      photoUri,
    });
    router.replace(`/product/${listing.id}`);
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <AppText variant="heading" accessibilityRole="header">
              מוצר חדש
            </AppText>
            <IconButton icon={X} accessibilityLabel="סגירה" onPress={() => goBack(router, '/home')} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photoUri ? 'החלפת תמונה' : 'הוספת תמונה'}
            onPress={pickPhoto}
            style={({ pressed }) => [styles.photo, pressed ? { opacity: 0.9 } : null]}
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={styles.photoBadge}>
                  <Camera size={14} color={colors.white} />
                  <AppText variant="captionMedium" color={colors.white}>
                    החלפת תמונה
                  </AppText>
                </View>
              </>
            ) : (
              <>
                <View style={styles.cameraCircle}>
                  <Camera size={26} color={colors.tomato} strokeWidth={1.75} />
                </View>
                <AppText variant="cardTitle" center>
                  הוסיפו תמונה אמיתית
                </AppText>
                <AppText variant="caption" color={colors.muted} center>
                  תמונה אמיתית = יותר אמון ויותר עסקאות
                </AppText>
              </>
            )}
          </Pressable>

          <View style={styles.field}>
            <AppText variant="label">קטגוריה</AppText>
            <View style={styles.chips}>
              {CATEGORY_ORDER.map((key) => (
                <Chip
                  key={key}
                  label={CATEGORIES[key].label}
                  selected={category === key}
                  onPress={() => setCategory(key)}
                />
              ))}
            </View>
          </View>

          <Input
            label="שם המוצר"
            placeholder="למשל: עוגיות שוקולד"
            value={title}
            onChangeText={setTitle}
            maxLength={40}
            returnKeyType="next"
          />

          <View style={styles.field}>
            <AppText variant="label">סוג עסקה</AppText>
            <SegmentedControl
              accessibilityLabel="סוג עסקה"
              options={DEAL_TYPES.map((key) => ({ key, label: DEAL_TYPE_LABELS[key] }))}
              value={dealType}
              onChange={setDealType}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="מחיר"
              placeholder="25"
              value={dealType === 'sale' ? price : DEAL_TYPE_LABELS[dealType]}
              onChangeText={(t) => setPrice(t.replace(/[^\d]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              editable={dealType === 'sale'}
              leading={
                dealType === 'sale' ? (
                  <AppText variant="bodyMedium" color={colors.muted}>
                    ₪
                  </AppText>
                ) : undefined
              }
              containerStyle={styles.half}
            />
            <Input
              label={`${freshVerb} ב-`}
              value={relativeDay(Number(freshDays))}
              onPressField={() => setFreshSheetOpen(true)}
              containerStyle={styles.half}
            />
          </View>

          <Input
            label="כמה מילים על המוצר (לא חובה)"
            placeholder="איך מכינים, כמה יש, מתי אפשר לאסוף..."
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={280}
          />

          <View style={styles.spacer} />

          <Button label="פרסום המוצר" onPress={publish} disabled={!canPublish} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={freshSheetOpen}
        title={`מתי ${freshVerb}?`}
        options={FRESH_OPTIONS.map((key) => ({ key, label: relativeDay(Number(key)) }))}
        value={freshDays}
        onSelect={setFreshDays}
        onClose={() => setFreshSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photo: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tomatoLight,
    marginBottom: 2,
  },
  photoBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    start: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(44, 44, 42, 0.6)',
  },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  spacer: { flexGrow: 1, minHeight: spacing.xs },
});
