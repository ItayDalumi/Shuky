import { forwardRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { border, colors, fonts, radius, spacing } from '@/theme';
import { webDir } from '@/lib/rtl';
import { AppText } from './AppText';

export type InputProps = TextInputProps & {
  label?: string;
  /** Rendered at the start (right) of the field */
  leading?: ReactNode;
  /** Rendered at the end (left) of the field */
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Left-to-right content (phone numbers, prices) */
  ltrValue?: boolean;
  /**
   * Turns the field into a select trigger: shows `value` (or the placeholder)
   * and calls this instead of opening the keyboard.
   */
  onPressField?: () => void;
};

export const Input = forwardRef<TextInputInstance, InputProps>(function Input(
  {
    label,
    leading,
    trailing,
    containerStyle,
    ltrValue,
    onPressField,
    style,
    editable = true,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  const fieldStyle = [
    styles.field,
    rest.multiline ? styles.fieldMultiline : null,
    focused ? styles.fieldFocused : null,
    !editable && !onPressField ? styles.fieldDisabled : null,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      {onPressField ? (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPressField} style={fieldStyle}>
          {leading}
          <AppText
            variant="body"
            color={rest.value ? colors.ink : colors.muted}
            numberOfLines={1}
            style={styles.selectText}
          >
            {rest.value || rest.placeholder}
          </AppText>
          {trailing ?? <ChevronDown size={18} color={colors.muted} />}
        </Pressable>
      ) : (
        <View style={fieldStyle}>
          {leading}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.muted}
            {...webDir(ltrValue ? 'ltr' : 'rtl')}
            {...rest}
            editable={editable}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              rest.multiline ? styles.inputMultiline : null,
              ltrValue ? styles.ltr : styles.rtl,
              style,
            ]}
          />
          {trailing}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  field: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderWidth: border.input,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  fieldMultiline: { height: undefined, minHeight: 100, alignItems: 'stretch', paddingVertical: spacing.sm },
  fieldFocused: { borderColor: colors.tomato },
  fieldDisabled: { backgroundColor: colors.cream },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    // Remove the default focus ring on web; the border color shows focus instead.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  inputMultiline: { height: undefined, minHeight: 76, textAlignVertical: 'top' },
  rtl: {},
  // Phone numbers / prices type left-to-right but stay on the right edge like the rest of the form.
  ltr: Platform.OS === 'web' ? { textAlign: 'right' } : { writingDirection: 'ltr' },
  selectText: { flex: 1 },
});
