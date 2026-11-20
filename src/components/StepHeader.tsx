import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

import { colors, spacing } from '@/theme';
import { goBack } from '@/lib/navigation';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export type StepHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
};

/** Onboarding header: back arrow (right side in RTL), big title, muted subtitle. */
export function StepHeader({ title, subtitle, onBack }: StepHeaderProps) {
  return (
    <View style={styles.container}>
      <IconButton
        icon={ArrowRight}
        accessibilityLabel="חזרה"
        onPress={onBack ?? (() => goBack(router, '/welcome'))}
        style={styles.back}
      />
      <View style={styles.texts}>
        <AppText variant="display">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" color={colors.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg + spacing.sm },
  back: { alignSelf: 'flex-start' },
  texts: { gap: spacing.sm },
});
