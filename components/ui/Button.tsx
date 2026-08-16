import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? Colors.ink : Colors.white} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as const]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  primary: { backgroundColor: Colors.ink },
  secondary: {
    backgroundColor: Colors.paperMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.danger },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
  },
  primaryLabel: { color: Colors.textOnDark },
  secondaryLabel: { color: Colors.text },
  ghostLabel: { color: Colors.goldDeep },
  dangerLabel: { color: Colors.white },
});
