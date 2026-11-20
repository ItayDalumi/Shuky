import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { webDir } from '@/lib/rtl';
import { border, colors, radius, spacing, WEB_MAX_WIDTH } from '@/theme';
import { AppText } from './AppText';

export type SelectSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: { key: T; label: string }[];
  value?: T;
  onSelect: (key: T) => void;
  onClose: () => void;
};

/** Simple bottom sheet with a list of options. */
export function SelectSheet<T extends string>({ visible, title, options, value, onSelect, onClose }: SelectSheetProps<T>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} {...webDir('rtl')}>
        <Pressable accessibilityLabel="סגירה" style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          <AppText variant="section" style={styles.title}>
            {title}
          </AppText>
          {options.map((option) => {
            const selected = option.key === value;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onSelect(option.key);
                  onClose();
                }}
                style={({ pressed }) => [styles.option, pressed ? { backgroundColor: colors.cream } : null]}
              >
                <AppText variant="bodyMedium" color={selected ? colors.tomato : colors.ink}>
                  {option.label}
                </AppText>
                {selected ? <Check size={20} color={colors.tomato} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(44, 44, 42, 0.35)' },
  sheet: {
    width: '100%',
    maxWidth: WEB_MAX_WIDTH,
    alignSelf: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderTopStartRadius: radius.xl,
    borderTopEndRadius: radius.xl,
    borderWidth: border.hairline,
    borderColor: colors.line,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.sm,
  },
  title: { marginBottom: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
});
