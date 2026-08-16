import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type Props = {
  title?: string;
  /** Explicit parent screen — preferred with Expo tabs (router.back is unreliable). */
  fallbackHref?: string;
};

export function BackHeader({ title, fallbackHref }: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  const onBack = () => {
    // Tab stacks often make canGoBack() jump to the first tab (Yönetim).
    // Prefer an explicit parent route when provided.
    if (fallbackHref) {
      router.navigate(fallbackHref as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.navigate('/(admin)' as any);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.ink} />
        <Text style={styles.backLabel}>{t('common.back')}</Text>
      </Pressable>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 44,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  backLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.ink,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textMuted,
  },
});
