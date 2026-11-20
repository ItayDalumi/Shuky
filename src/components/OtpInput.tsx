import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { webDir } from '@/lib/rtl';
import { border, colors, radius } from '@/theme';
import { AppText } from './AppText';

export type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
};

/**
 * 4 digit boxes backed by one invisible TextInput, so paste and SMS autofill work.
 * Digits read left to right, like the code in the SMS.
 */
export function OtpInput({ value, onChange, length = 4, autoFocus }: OtpInputProps) {
  const inputRef = useRef<TextInputInstance>(null);

  return (
    <Pressable
      accessibilityLabel="קוד אימות"
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
      {...webDir('ltr')}
    >
      {Array.from({ length }, (_, i) => {
        const digit = value[i];
        const active = i === Math.min(value.length, length - 1) && value.length < length;
        return (
          <View key={i} style={[styles.box, active ? styles.boxActive : null, digit ? styles.boxFilled : null]}>
            {digit ? (
              <AppText variant="display" weight="bold" style={styles.digit}>
                {digit}
              </AppText>
            ) : active ? (
              <View style={styles.cursor} />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    // Native: Yoga layout direction. Web: the `dir` prop above.
    ...(Platform.OS === 'web' ? null : { direction: 'ltr' as const }),
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  box: {
    width: 70,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: border.input,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  boxFilled: { borderColor: colors.line },
  boxActive: { borderColor: colors.tomato, borderWidth: 2 },
  digit: { fontSize: 30, lineHeight: 36 },
  cursor: { width: 2, height: 30, borderRadius: 1, backgroundColor: colors.tomato },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    // Fully hidden on web (focus ring included); a hair visible on native so iOS keeps it focusable.
    opacity: Platform.OS === 'web' ? 0 : 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
    borderWidth: 0,
    fontSize: 1,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
