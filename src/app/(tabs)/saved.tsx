import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';

import { AppText, Button, EmptyState, ProductGrid, Screen } from '@/components';
import { useAppStore } from '@/store/AppStore';
import { spacing } from '@/theme';

/** שמורים. Phase 3 persists saved items per user. */
export default function SavedScreen() {
  const { savedListings } = useAppStore();

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <AppText variant="heading" accessibilityRole="header">
          שמורים
        </AppText>

        {savedListings.length > 0 ? (
          <ProductGrid listings={savedListings} />
        ) : (
          <EmptyState
            icon={Heart}
            title="עוד לא שמרת מוצרים"
            message="לחצו על הלב בעמוד מוצר כדי לשמור אותו כאן"
            action={<Button label="לגלות מה יש בשכונה" onPress={() => router.navigate('/home')} />}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
});
