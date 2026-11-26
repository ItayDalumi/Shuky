import { useState } from 'react';
import {
  Image,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';

import {
  AppText,
  Button,
  BakeryArt,
  CategoryChip,
  Chip,
  IconButton,
  Input,
  Screen,
  SegmentedControl,
  SelectSheet,
} from '@/components';
import { CATEGORIES, CATEGORY_ORDER, DIETARY_LABELS, DIETARY_ORDER, NOTICE_OPTIONS } from '@/data/categories';
import type { Availability, Category, DietaryTag } from '@/data/types';
import { errorMessage, type NewPhoto } from '@/lib/api';
import { preparePhoto } from '@/lib/photo';
import { AVAILABILITY_LABELS, daysAgo, formatQuantity, noticeLabel, parseQuantity, relativeDay } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/** iOS number pads have no return key: a "done" bar above the keyboard closes it. */
const NUMERIC_DONE_ID = 'numeric-done';
const numericDone = Platform.OS === 'ios' ? { inputAccessoryViewID: NUMERIC_DONE_ID } : {};

const AVAILABILITY: Availability[] = ['ready', 'preorder'];
const BAKED_OPTIONS = ['0', '1', '2'] as const;
type BakedKey = (typeof BAKED_OPTIONS)[number];
type NoticeKey = `${(typeof NOTICE_OPTIONS)[number]}`;

/**
 * 07 · הוספת מוצר, and editing (?edit=<listing id>).
 * Live mode uploads the photo to Supabase Storage and inserts / updates `listings`.
 */
export default function NewListingScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { addListing, updateListing, getListing } = useAppStore();
  const editing = edit ? getListing(edit) : undefined;

  const [photoUri, setPhotoUri] = useState<string | undefined>(editing?.photoUri);
  const [photo, setPhoto] = useState<NewPhoto>();
  const [category, setCategory] = useState<Category>(editing?.category ?? 'cakes');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [availability, setAvailability] = useState<Availability>(editing?.availability ?? 'ready');
  const [price, setPrice] = useState(editing ? String(editing.price) : '');
  const [bakedDays, setBakedDays] = useState<BakedKey>(
    editing?.bakedAt ? (`${Math.min(2, daysAgo(editing.bakedAt))}` as BakedKey) : '0',
  );
  const [noticeDays, setNoticeDays] = useState<NoticeKey>(editing?.noticeDays ? (`${editing.noticeDays}` as NoticeKey) : '2');
  const [quantity, setQuantity] = useState(parseQuantity(editing?.unit));
  const [dietary, setDietary] = useState<DietaryTag[]>(editing?.dietary ?? ['kosher']);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [sheet, setSheet] = useState<'baked' | 'notice' | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preorder = availability === 'preorder';
  const priceNumber = Number(price);
  const canPublish = title.trim().length > 1 && priceNumber > 0;

  const toggleDietary = (tag: DietaryTag) =>
    setDietary((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      exif: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    try {
      // Re-encode + downsize: removes hidden metadata such as the GPS location of your home.
      const prepared = await preparePhoto(asset.uri);
      setPhotoUri(prepared.uri);
      setPhoto({ base64: prepared.base64, mimeType: prepared.mimeType });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const publish = async () => {
    if (!canPublish || publishing) return;
    const bakedAt = new Date();
    bakedAt.setDate(bakedAt.getDate() - Number(bakedDays));
    setPublishing(true);
    setError(null);
    try {
      const input = {
        title: title.trim(),
        category,
        price: priceNumber,
        unit: Number(quantity) > 0 ? formatQuantity(Number(quantity)) : undefined,
        description: description.trim(),
        availability,
        bakedAt: preorder ? undefined : bakedAt.toISOString(),
        noticeDays: preorder ? Number(noticeDays) : undefined,
        dietary: DIETARY_ORDER.filter((t) => dietary.includes(t)),
        photo,
        localPhotoUri: photoUri,
      };
      if (editing) {
        await updateListing(editing.id, input);
        goBack(router, `/product/${editing.id}`);
      } else {
        const id = await addListing(input);
        router.replace(`/product/${id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <AppText variant="heading" accessibilityRole="header">
              {editing ? 'עריכת מאפה' : 'מאפה חדש'}
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
                  <BakeryArt category={category} size={64} background={colors.white} />
                  <View style={styles.cameraBadge}>
                    <Camera size={16} color={colors.white} strokeWidth={2} />
                  </View>
                </View>
                <AppText variant="cardTitle" center>
                  הוסיפו תמונה אמיתית
                </AppText>
                <AppText variant="caption" color={colors.muted} center>
                  תמונה אמיתית = יותר אמון ויותר הזמנות
                </AppText>
              </>
            )}
          </Pressable>

          <View style={styles.field}>
            <AppText variant="label">קטגוריה</AppText>
            <View style={styles.chips}>
              {CATEGORY_ORDER.map((key) => (
                <CategoryChip
                  key={key}
                  category={key}
                  label={CATEGORIES[key].label}
                  selected={category === key}
                  onPress={() => setCategory(key)}
                />
              ))}
            </View>
          </View>

          <Input
            label="שם המאפה"
            placeholder="למשל: עוגת גבינה פירורים"
            value={title}
            onChangeText={setTitle}
            maxLength={40}
            returnKeyType="next"
          />

          <View style={styles.field}>
            <AppText variant="label">זמינות</AppText>
            <SegmentedControl
              accessibilityLabel="זמינות"
              options={AVAILABILITY.map((key) => ({ key, label: AVAILABILITY_LABELS[key] }))}
              value={availability}
              onChange={setAvailability}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="מחיר"
              placeholder="25"
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^\d]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              inputMode="numeric"
              {...numericDone}
              leading={
                <AppText variant="bodyMedium" color={colors.muted}>
                  ₪
                </AppText>
              }
              containerStyle={styles.half}
            />
            {preorder ? (
              <Input
                label="להזמין"
                value={noticeLabel(Number(noticeDays))}
                onPressField={() => setSheet('notice')}
                containerStyle={styles.half}
              />
            ) : (
              <Input
                label="נאפה ב-"
                value={relativeDay(Number(bakedDays))}
                onPressField={() => setSheet('baked')}
                containerStyle={styles.half}
              />
            )}
          </View>

          <Input
            label="כמות יחידות (לא חובה)"
            placeholder="למשל: 12"
            value={quantity}
            onChangeText={(t) => setQuantity(t.replace(/[^\d]/g, '').replace(/^0+/, '').slice(0, 3))}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={3}
            trailing={
              quantity ? (
                <AppText variant="body" color={colors.muted}>
                  {quantity === '1' ? 'יחידה' : 'יחידות'}
                </AppText>
              ) : undefined
            }
            {...numericDone}
          />

          <View style={styles.field}>
            <AppText variant="label">מתאים ל...</AppText>
            <View style={styles.chips}>
              {DIETARY_ORDER.map((tag) => (
                <Chip
                  key={tag}
                  label={DIETARY_LABELS[tag]}
                  selected={dietary.includes(tag)}
                  onPress={() => toggleDietary(tag)}
                />
              ))}
            </View>
          </View>

          <Input
            label="כמה מילים על המאפה (לא חובה)"
            placeholder="מה יש בפנים, איך שומרים, מתי אפשר לאסוף..."
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={280}
          />

          <View style={styles.spacer} />

          {error ? (
            <AppText variant="small" color={colors.cherryDark} center>
              {error}
            </AppText>
          ) : null}
          <Button
            label={editing ? 'שמירת השינויים' : 'פרסום המאפה'}
            onPress={publish}
            disabled={!canPublish}
            loading={publishing}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectSheet
        visible={sheet === 'baked'}
        title="מתי נאפה?"
        options={BAKED_OPTIONS.map((key) => ({ key, label: relativeDay(Number(key)) }))}
        value={bakedDays}
        onSelect={setBakedDays}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'notice'}
        title="כמה זמן מראש צריך להזמין?"
        options={NOTICE_OPTIONS.map((d) => ({ key: `${d}` as NoticeKey, label: noticeLabel(d) }))}
        value={noticeDays}
        onSelect={setNoticeDays}
        onClose={() => setSheet(null)}
      />
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={NUMERIC_DONE_ID}>
          <View style={styles.accessory}>
            <Pressable accessibilityRole="button" onPress={Keyboard.dismiss} hitSlop={8}>
              <AppText variant="bodyMedium" color={colors.cherry}>
                סיום
              </AppText>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
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
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
    backgroundColor: colors.dough,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.crust,
    borderRadius: radius.xl,
  },
  cameraCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cherry,
    borderWidth: 2,
    borderColor: colors.white,
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
  accessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.cream,
    borderTopWidth: border.hairline,
    borderTopColor: colors.line,
  },
});
