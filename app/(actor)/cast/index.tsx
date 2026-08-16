import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CastCard } from '@/components/cast/CastCard';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCasts } from '@/lib/access';
import { fetchPublishedCasts } from '@/services/casts';
import type { CastListing } from '@/types/database';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function CastListScreen() {
  const { t } = useTranslation();
  const { profile, actorProfile, galleryPhotos } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CastListing[]>([]);
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);

  useFocusEffect(
    useCallback(() => {
      if (!castOk) {
        setItems([]);
        return;
      }
      fetchPublishedCasts()
        .then(setItems)
        .catch(() => setItems([]));
    }, [castOk])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>{t('cast.title')}</Text>
      {!castOk ? (
        <View style={styles.gate}>
          <AccessGateCard />
          <MediaAccessCard />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          ListEmptyComponent={<Text style={styles.empty}>{t('cast.empty')}</Text>}
          renderItem={({ item }) => (
            <CastCard item={item} onPress={() => router.push(`/(actor)/cast/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.ink,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gate: { paddingHorizontal: Spacing.lg },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  empty: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
