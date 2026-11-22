import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, CalendarClock, Clock, Handshake, Heart, PackageSearch } from 'lucide-react-native';

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
import { errorMessage } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { availabilityLabel, formatPriceLine, noticeLabel } from '@/lib/format';
import { XP_PER_TRADE } from '@/lib/levels';
import { goBack } from '@/lib/navigation';
import { openWhatsApp } from '@/lib/whatsapp';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/** 06 · עמוד מוצר */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getListing, getSeller, isSaved, toggleSaved, user, openTradeFor, markBought, deleteListing } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const openTrade = openTradeFor(listing.id);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // Buyer marks the purchase; the seller confirms; then both get XP (enforced by the server).
  const onBought = () =>
    confirmAction({
      title: 'קנית את זה?',
      message: `נבקש מ${firstName} לאשר. ברגע ששניכם מאשרים, כל אחד מקבל ${XP_PER_TRADE} נקודות.`,
      confirmLabel: 'כן, קניתי',
      onConfirm: () =>
        run(async () => {
          const tradeId = await markBought(listing.id);
          router.push(`/trade/${tradeId}`);
        }),
    });

  const onDelete = () =>
    confirmAction({
      title: 'למחוק את המוצר?',
      message: 'המוצר יוסר מהשכונה. אי אפשר לבטל את הפעולה.',
      confirmLabel: 'מחיקה',
      destructive: true,
      onConfirm: () =>
        run(async () => {
          await deleteListing(listing.id);
          goBack(router, '/profile');
        }),
    });

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

          <SellerCard seller={seller} isMine={isMine} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {error ? (
          <AppText variant="small" color={colors.tomatoDark} center>
            {error}
          </AppText>
        ) : null}
        {isMine ? (
          <>
            <View style={styles.mineNote}>
              <AppText variant="small" color={colors.leafDark} center>
                זה המוצר שלך. שכנים שמתעניינים יפנו אליך בוואטסאפ.
              </AppText>
            </View>
            <View style={styles.actions}>
              <Button
                label="עריכה"
                variant="secondary"
                onPress={() => router.push({ pathname: '/listing/new', params: { edit: listing.id } })}
                style={styles.action}
              />
              <Button label="מחיקה" variant="secondary" onPress={onDelete} loading={busy} style={styles.action} />
            </View>
          </>
        ) : (
          <>
            <Button
              label={preorder ? 'הזמנה מראש בוואטסאפ' : 'הזמנה בוואטסאפ'}
              variant="leaf"
              icon={<WhatsAppIcon size={22} />}
              onPress={order}
              accessibilityLabel={`הזמנה מ${seller.name} בוואטסאפ`}
            />
            {openTrade ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(`/trade/${openTrade.id}`)}
                style={styles.tradeStatus}
              >
                <Handshake size={16} color={colors.honeyDark} />
                <AppText variant="captionMedium" color={colors.honeyDark}>
                  {openTrade.iConfirmed ? `סימנת שקנית · מחכים לאישור של ${firstName}` : `${firstName} מחכה לאישור שלך`}
                </AppText>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={onBought} disabled={busy}>
                <AppText variant="caption" color={colors.muted} center style={styles.doneLink}>
                  {`קניתי את זה · סמנו עסקה וקבלו ${XP_PER_TRADE} נקודות`}
                </AppText>
              </Pressable>
            )}
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
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  tradeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: colors.honeyLight,
    borderRadius: radius.pill,
  },
  mineNote: {
    padding: spacing.md,
    backgroundColor: colors.leafLight,
    borderRadius: radius.lg,
    borderWidth: border.hairline,
    borderColor: colors.leafLight,
  },
});
