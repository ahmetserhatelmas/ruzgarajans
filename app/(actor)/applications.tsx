import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/ui/BackHeader';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { VideoPlayerModal } from '@/components/video/VideoPlayerModal';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCasts } from '@/lib/access';
import { supabase } from '@/lib/supabase';
import type { ApplicationStatus } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type AppRow = {
  id: string;
  cast_id: string;
  status: ApplicationStatus;
  accept_budget: boolean;
  counter_budget: number | null;
  cast_listings: {
    project_name: string;
    role_name: string;
  } | null;
};

export default function ApplicationsScreen() {
  const { t } = useTranslation();
  const { user, profile, actorProfile, galleryPhotos } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppRow[]>([]);
  const [videoByCast, setVideoByCast] = useState<Map<string, { url: string; title: string }>>(
    new Map()
  );
  const [watching, setWatching] = useState<{ url: string; title: string } | null>(null);
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);

  useFocusEffect(
    useCallback(() => {
      if (!user || !castOk) {
        setItems([]);
        return;
      }
      void Promise.all([
        supabase
          .from('applications')
          .select(
            'id, cast_id, status, accept_budget, counter_budget, cast_listings(project_name, role_name)'
          )
          .eq('actor_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('videos')
          .select('cast_id, playback_url, title')
          .eq('user_id', user.id)
          .eq('kind', 'audition')
          .eq('status', 'ready')
          .not('playback_url', 'is', null)
          .order('created_at', { ascending: false }),
      ])
        .then(([apps, vids]) => {
          setItems((apps.data as unknown as AppRow[]) ?? []);
          const map = new Map<string, { url: string; title: string }>();
          for (const row of vids.data ?? []) {
            if (!row.cast_id || !row.playback_url || map.has(row.cast_id)) continue;
            map.set(row.cast_id, {
              url: row.playback_url,
              title: row.title || t('cast.audition'),
            });
          }
          setVideoByCast(map);
        })
        .catch(() => {
          setItems([]);
          setVideoByCast(new Map());
        });
    }, [user, castOk])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <BackHeader fallbackHref="/(actor)" />
      </View>
      <Text style={styles.title}>{t('home.applications')}</Text>
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
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(actor)/cast/${item.cast_id}`)}
            >
              <Text style={styles.project}>
                {item.cast_listings?.project_name ?? t('cast.project')}
              </Text>
              <Text style={styles.role}>
                {t('cast.role')}: {item.cast_listings?.role_name ?? '—'}
              </Text>
              <Text style={styles.status}>{t(`status.${item.status}` as any)}</Text>
              {!item.accept_budget && item.counter_budget != null ? (
                <Text style={styles.offer}>
                  {t('cast.yourOffer')}: {item.counter_budget.toLocaleString('tr-TR')} TRY
                </Text>
              ) : null}
              {videoByCast.get(item.cast_id) ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    const video = videoByCast.get(item.cast_id);
                    if (video) setWatching(video);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.watch}>{t('cast.watchSentVideo')}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          )}
        />
      )}
      <VideoPlayerModal
        visible={Boolean(watching)}
        uri={watching?.url ?? null}
        title={watching?.title}
        onClose={() => setWatching(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  gate: { paddingHorizontal: Spacing.lg },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  project: { fontFamily: Fonts.bodyBold, color: Colors.ink, fontSize: 17 },
  role: { fontFamily: Fonts.body, color: Colors.textMuted },
  status: { fontFamily: Fonts.bodyMedium, color: Colors.goldDeep },
  offer: { fontFamily: Fonts.body, color: Colors.textMuted },
  watch: {
    marginTop: 6,
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.brand,
  },
});
