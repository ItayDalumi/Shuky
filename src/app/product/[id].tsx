import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, CalendarClock, Clock, Heart, PackageSearch } from 'lucide-react-native';

import {
  AppText,
  Button,
  CategoryArt,
  EmptyState,
  IconButton,
  Pill,
  Screen,
  SellerCard,
  WhatsAppIcon,
} from '@/components';
import { CATEGORIES, DIETARY_LABELS } from '@/data/categories';
import { availabilityLabel, formatPriceLine, noticeLabel } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { openWhatsApp } from '@/lib/whatsapp';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/** 06 · עמוד מוצר */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getListing, getSeller, isSaved, toggleSaved, user } = useAppStore();

  const listing = id ? getListing(id) : undefined;
  const seller = listing ? getSeller(listing.sellerId) : undefined;

  if (!listing || !seller) {
    return (
      <Screen>
        <View style={styles.missing}>
          <EmptyState
            icon={PackageSearch}
            title="המוצר הזה כבר לא זמין"
            message="אולי הוא נמכר, ואולי פשוט נאכל"
            action={<Button label="חזרה לבית" onPress={() => router.replace('/home')} />}
          />
        </View>
      </Screen>
    );
  }

  const category = CATEGORIES[listing.category];
  const saved = isSaved(listing.id);
  const isMine = seller.id === user.id;
  const firstName = seller.name.split(' ')[0];
  const preorder = listing.availability === 'preorder';

  // No in-app chat or payments: ordering happens in WhatsApp, payment between neighbors.
  const order = () =>
    openWhatsApp(
      seller.whatsapp,
      preorder
        ? `היי ${firstName}! ראיתי בשוקי את "${listing.title}" ואשמח להזמין מראש. לאיזה תאריך אפשר?`
        : `היי ${firstName}! ראיתי בשוקי את "${listing.title}" ואשמח להזמין 🙂 זה עדיין זמין?`,
    );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.imageWrap}>
          <CategoryArt
            category={listing.category}
            photoUri={listing.photoUri}
            iconSize={132}
            style={styles.image}
          />
          <IconButton
            icon={ArrowRight}
            accessibilityLabel="חזרה"
            onPress={() => goBack(router, '/home')}
            style={[styles.overlayButton, styles.overlayStart]}
          />
          <IconButton
            icon={Heart}
            accessibilityLabel={saved ? 'הסרה מהשמורים' : 'שמירה'}
            color={saved ? colors.tomato : colors.ink}
            filled={saved}
            onPress={() => toggleSaved(listing.id)}
            style={[styles.overlayButton, styles.overlayEnd]}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.tags}>
            <Pill label={category.label} tone={category.tone} />
            <Pill
              label={availabilityLabel(listing)}
              icon={preorder ? CalendarClock : Clock}
              tone={preorder ? 'honey' : 'leaf'}
            />
          </View>

          <AppText variant="title" accessibilityRole="header">
            {listing.title}
          </AppText>
          <AppText variant="heading" color={colors.tomato}>
            {formatPriceLine(listing)}
          </AppText>
          {listing.description ? (
            <AppText variant="callout" style={styles.description}>
              {listing.description}
            </AppText>
          ) : null}

          {listing.dietary.length > 0 ? (
            <View style={styles.dietary} accessibilityLabel="מתאים ל">
              {listing.dietary.map((tag) => (
                <Pill key={tag} label={DIETARY_LABELS[tag]} tone="neutral" style={styles.dietaryPill} />
              ))}
            </View>
          ) : null}

          {preorder ? (
            <AppText variant="small" color={colors.muted}>
              {`נאפה במיוחד בשבילך. צריך להזמין ${noticeLabel(listing.noticeDays ?? 1)}.`}
            </AppText>
          ) : null}

          <SellerCard seller={seller} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isMine ? (
          <View style={styles.mineNote}>
            <AppText variant="small" color={colors.leafDark} center>
              זה המוצר שלך. שכנים שמתעניינים יפנו אליך בוואטסאפ.
            </AppText>
          </View>
        ) : (
          <>
            <Button
              label={preorder ? 'הזמנה מראש בוואטסאפ' : 'הזמנה בוואטסאפ'}
              variant="leaf"
              icon={<WhatsAppIcon size={22} />}
              onPress={order}
              accessibilityLabel={`הזמנה מ${seller.name} בוואטסאפ`}
            />
            <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push(`/trade/${listing.id}`)}>
              <AppText variant="caption" color={colors.muted} center style={styles.doneLink}>
                סגרתם עסקה? סמנו שהיא הושלמה
              </AppText>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.md },
  missing: { flex: 1, justifyContent: 'center' },
  imageWrap: { height: 290 },
  image: { flex: 1 },
  overlayButton: { position: 'absolute', top: spacing.sm },
  overlayStart: { start: spacing.screen },
  overlayEnd: { end: spacing.screen },
  body: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screen,
  },
  tags: { flexDirection: 'row', gap: spacing.xs },
  description: { marginBottom: spacing.xxs },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.screen,
    backgroundColor: colors.cream,
  },
  dietary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dietaryPill: { borderWidth: border.hairline, borderColor: colors.line },
  doneLink: { textDecorationLine: 'underline' },
  mineNote: {
    padding: spacing.md,
    backgroundColor: colors.leafLight,
    borderRadius: radius.lg,
    borderWidth: border.hairline,
    borderColor: colors.leafLight,
  },
});
