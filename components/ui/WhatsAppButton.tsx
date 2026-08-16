import React from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing, WHATSAPP_SUPPORT_URL } from '@/constants/theme';

export function WhatsAppButton() {
  const { t } = useTranslation();
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
      onPress={() => Linking.openURL(WHATSAPP_SUPPORT_URL)}
    >
      <Ionicons name="logo-whatsapp" size={20} color={Colors.white} />
      <Text style={styles.label}>{t('common.whatsapp')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#1FA855',
    minHeight: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
  },
  label: {
    color: Colors.white,
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
});
