import { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { Search } from 'lucide-react-native';

import { webDir } from '@/lib/rtl';
import { border, colors, fonts, radius, spacing } from '@/theme';

/** "מה בא לך היום?" search bar */
export const SearchField = forwardRef<TextInputInstance, TextInputProps>(function SearchField(props, ref) {
  return (
    <View style={styles.field} accessibilityRole="search">
      <Search size={20} color={colors.muted} strokeWidth={2} />
      <TextInput
        ref={ref}
        placeholder="מה בא לך היום?"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        accessibilityLabel="חיפוש מאפים"
        {...webDir('rtl')}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
