import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CastCard } from '@/components/cast/CastCard';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCasts } from '@/lib/access';
import { fetchMyCastOptions, fetchMyIntroducedCastIds, fetchPublishedCasts } from '@/services/casts';
import type { CastListing, CastOptionStatus } from '@/types/database';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function CastListScreen() {
  const { t } = useTranslation();
  const { user, profile, actorProfile, galleryPhotos } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CastListing[]>([]);
  const [introducedIds, setIntroducedIds] = useState<Set<string>>(new Set());
  const [optionByCast, setOptionByCast] = useState<Map<string, CastOptionStatus>>(new Map());
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);

  useFocusEffect(
    useCallback(() => {
      if (!castOk) {
        setItems([]);
        setIntroducedIds(new Set());
        setOptionByCast(new Map());
        return;
      }
      fetchPublishedCasts()
        .then(setItems)
        .catch(() => setItems([]));
      if (user) {
        fetchMyIntroducedCastIds(user.id)
          .then((ids) => setIntroducedIds(new Set(ids)))
          .catch(() => setIntroducedIds(new Set()));
        fetchMyCastOptions(user.id)
          .then((rows) => setOptionByCast(new Map(rows.map((r) => [r.cast_id, r.status]))))
          .catch(() => setOptionByCast(new Map()));
      }
    }, [castOk, user])
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
            <CastCard
              item={item}
              introduced={introducedIds.has(item.id)}
              optionStatus={optionByCast.get(item.id)}
              onPress={() => router.push(`/(actor)/cast/${item.id}`)}
            />
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
