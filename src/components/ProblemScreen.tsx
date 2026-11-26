import { StyleSheet, View } from 'react-native';

import type { Category } from '@/data/types';
import { CATEGORIES } from '@/data/categories';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { BakeryArt } from './BakeryArt';
import { Button } from './Button';
import { Screen } from './Screen';

export type ProblemScreenProps = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  art?: Category;
};

/** Full-screen "something's wrong" state: no connection at launch, or an unexpected crash. */
export function ProblemScreen({ title, message, actionLabel, onAction, art = 'pastries' }: ProblemScreenProps) {
  const background = CATEGORIES[art].background;
  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.spacer} />
        <View style={[styles.circle, { backgroundColor: background }]}>
          <BakeryArt category={art} size={150} background={background} />
        </View>
        <AppText variant="display" center accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" color={colors.muted} center>
          {message}
        </AppText>
        <View style={styles.spacer} />
        <Button label={actionLabel} onPress={onAction} />
      </View>
    </Screen>
  );
}

/** Shown when the app starts with a saved session but can't reach the server. */
export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <ProblemScreen
      title="אין חיבור לאינטרנט"
      message="לא הצלחנו להגיע לשרת. בדקו את ה-Wi-Fi או הסלולר ונסו שוב. אתם עדיין מחוברים לחשבון."
      actionLabel="נסו שוב"
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
  },
  spacer: { flexGrow: 1 },
  circle: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
