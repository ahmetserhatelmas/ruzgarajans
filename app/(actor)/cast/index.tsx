import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CastCard } from '@/components/cast/CastCard';
import { InboxBell } from '@/components/ui/InboxBell';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { Button } from '@/components/ui/Button';
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
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);

  const loadList = useCallback(() => {
    if (!castOk) {
      setItems([]);
      setIntroducedIds(new Set());
      setOptionByCast(new Map());
      setLoadError(false);
      setReady(true);
      return;
    }
    setLoadError(false);
    setReady(false);
    void (async () => {
      try {
        const [list, introIds, optionRows] = await Promise.all([
          fetchPublishedCasts(),
          user ? fetchMyIntroducedCastIds(user.id) : Promise.resolve([] as string[]),
          user
            ? fetchMyCastOptions(user.id)
            : Promise.resolve([] as { cast_id: string; status: CastOptionStatus }[]),
        ]);
        setItems(list);
        setIntroducedIds(new Set(introIds));
        setOptionByCast(new Map(optionRows.map((r) => [r.cast_id, r.status])));
      } catch {
        setLoadError(true);
      } finally {
        setReady(true);
      }
    })();
  }, [castOk, user]);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('cast.title')}</Text>
        <InboxBell />
      </View>
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
          ListEmptyComponent={
            <View>
              <Text style={styles.empty}>
                {!ready
                  ? t('common.loading')
                  : loadError
                    ? t('cast.loadFailed')
                    : t('cast.empty')}
              </Text>
              {ready && loadError ? (
                <Button label={t('common.retry')} onPress={loadList} />
              ) : null}
            </View>
          }
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.ink,
    paddingRight: Spacing.sm,
  },
  gate: { paddingHorizontal: Spacing.lg },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  empty: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
