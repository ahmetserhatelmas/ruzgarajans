import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CastListing, CastOptionStatus } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  item: CastListing;
  onPress: () => void;
  introduced?: boolean;
  optionStatus?: CastOptionStatus | null;
};

export function CastCard({ item, onPress, introduced, optionStatus }: Props) {
  const { t } = useTranslation();
  const optionChip =
    optionStatus === 'pending'
      ? t('cast.optionChipPending')
      : optionStatus === 'accepted'
        ? t('cast.optionChipYes')
        : optionStatus === 'declined'
          ? t('cast.optionChipNo')
          : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <View style={styles.top}>
        {item.cover_image_url ? (
          <Image source={{ uri: item.cover_image_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoEmpty]} />
        )}
        <View style={styles.copy}>
          <Text style={styles.project}>{item.project_name}</Text>
          <Text style={styles.role}>
            {t('cast.role')}: {item.role_name}
          </Text>
          {optionChip ? <Text style={styles.chip}>{optionChip}</Text> : null}
          {introduced ? <Text style={styles.chip}>{t('cast.introducedChip')}</Text> : null}
        </View>
      </View>
      <Text style={styles.desc} numberOfLines={2}>
        {item.role_description}
      </Text>
      <View style={styles.metaRow}>
        {item.deadline ? (
          <Text style={styles.meta}>
            {t('cast.deadline')}: {item.deadline}
          </Text>
        ) : null}
        {item.option_date ? (
          <Text style={styles.meta}>
            {t('cast.optionDate')}: {item.option_date}
          </Text>
        ) : null}
        {item.payment_due_date ? (
          <Text style={styles.meta}>
            {t('cast.paymentDue')}: {item.payment_due_date}
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.paperMuted,
  },
  logoEmpty: {
    backgroundColor: Colors.border,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
  chip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.brandDeep,
    backgroundColor: Colors.paperMuted,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  meta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.text,
  },
});
