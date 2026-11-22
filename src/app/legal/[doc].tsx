import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppText, Screen, ScreenHeader } from '@/components';
import { LAST_UPDATED, LEGAL_DOCS } from '@/content/legal';
import { colors, spacing } from '@/theme';

/** /legal/privacy and /legal/terms. Reachable signed out too (from the sign-up screen). */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = doc === 'terms' ? LEGAL_DOCS.terms : LEGAL_DOCS.privacy;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenHeader title={content.title} fallback="/" />
        <AppText variant="caption" color={colors.muted}>
          {`עודכן לאחרונה: ${LAST_UPDATED}`}
        </AppText>
        <AppText variant="callout">{content.intro}</AppText>
        {content.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <AppText variant="section" accessibilityRole="header">
              {section.title}
            </AppText>
            {section.blocks.map((block, i) =>
              block.type === 'p' ? (
                <AppText key={i} variant="callout">
                  {block.text}
                </AppText>
              ) : (
                <View key={i} style={styles.list}>
                  {block.items.map((item) => (
                    <View key={item} style={styles.item}>
                      <View style={styles.bullet} />
                      <AppText variant="callout" style={styles.itemText}>
                        {item}
                      </AppText>
                    </View>
                  ))}
                </View>
              ),
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.screen,
  },
  section: { gap: spacing.xs },
  list: { gap: 6 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tomato, marginTop: 9 },
  itemText: { flex: 1 },
});
