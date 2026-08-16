import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CastListing } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  item: CastListing;
  onPress: () => void;
};

export function CastCard({ item, onPress }: Props) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <Text style={styles.project}>{item.project_name}</Text>
      <Text style={styles.role}>
        {t('cast.role')}: {item.role_name}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>
        {item.role_description}
      </Text>
      <View style={styles.metaRow}>
        {item.deadline ? (
          <Text style={styles.meta}>
            {t('cast.deadline')}: {item.deadline}
          </Text>
        ) : null}
        {item.budget_amount != null ? (
          <Text style={styles.meta}>
            {item.budget_amount.toLocaleString()} {item.budget_currency}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  project: {
    fontFamily: Fonts.displayBold,
    fontSize: 26,
    color: Colors.ink,
  },
  role: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.goldDeep,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  meta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.text,
  },
});
