import { useMemo } from 'react';
import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';

import { AppText, Button, EmptyState, FeedList, Screen, type FeedSection } from '@/components';
import { useAppStore } from '@/store/AppStore';

/** שמורים. Phase 3 persists saved items per user. */
export default function SavedScreen() {
  const { savedListings } = useAppStore();

  const sections = useMemo<FeedSection[]>(() => [{ key: 'saved', listings: savedListings }], [savedListings]);

  return (
    <Screen edges={['top']}>
      <FeedList
        header={
          <AppText variant="heading" accessibilityRole="header">
            שמורים
          </AppText>
        }
        sections={sections}
        empty={
          <EmptyState
            icon={Heart}
            art="cookies"
            title="עוד לא שמרת מאפים"
            message="לחצו על הלב בעמוד של מאפה כדי לשמור אותו כאן"
            action={<Button label="לגלות מה יש בשכונה" onPress={() => router.navigate('/home')} />}
          />
        }
      />
    </Screen>
  );
}
