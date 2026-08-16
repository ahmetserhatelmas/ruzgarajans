import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { fetchAuditionVideosAdmin } from '@/services/videos';
import type { ApplicationStatus, Video } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type AppRow = {
  id: string;
  actor_id: string;
  cast_id: string;
  status: ApplicationStatus;
  accept_budget: boolean;
  counter_budget: number | null;
  note: string | null;
  cast_listings: {
    project_name: string;
    role_name: string;
  } | null;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export default function AdminApplicationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<AppRow[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  const load = useCallback(() => {
    Promise.all([
      supabase
        .from('applications')
        .select(
          'id, actor_id, cast_id, status, accept_budget, counter_budget, note, cast_listings(project_name, role_name), profiles:actor_id(full_name, email)'
        )
        .order('created_at', { ascending: false }),
      fetchAuditionVideosAdmin(),
    ])
      .then(([{ data, error }, vids]) => {
        if (error) {
          console.warn(error.message);
          setItems([]);
        } else {
          setItems((data as unknown as AppRow[]) ?? []);
        }
        setVideos(vids);
      })
      .catch(() => {
        setItems([]);
        setVideos([]);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const videosByApp = useMemo(() => {
    const byApp = new Map<string, Video[]>();
    const byActorCast = new Map<string, Video[]>();

    for (const v of videos) {
      if (v.application_id) {
        const list = byApp.get(v.application_id) ?? [];
        list.push(v);
        byApp.set(v.application_id, list);
      }
      if (v.cast_id && v.user_id) {
        const key = `${v.cast_id}:${v.user_id}`;
        const list = byActorCast.get(key) ?? [];
        list.push(v);
        byActorCast.set(key, list);
      }
    }

    const result = new Map<string, Video[]>();
    for (const app of items) {
      const linked = byApp.get(app.id) ?? [];
      const fallback = byActorCast.get(`${app.cast_id}:${app.actor_id}`) ?? [];
      const merged = [...linked];
      for (const v of fallback) {
        if (!merged.some((x) => x.id === v.id)) merged.push(v);
      }
      if (merged.length) result.set(app.id, merged);
    }
    return result;
  }, [items, videos]);

  const setStatus = async (id: string, status: ApplicationStatus) => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', id);
    if (error) Alert.alert(t('common.error'), error.message);
    else load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>{t('admin.applications')}</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const project = item.cast_listings?.project_name ?? '—';
          const role = item.cast_listings?.role_name ?? '';
          const actor = item.profiles?.full_name || item.profiles?.email || '—';
          const appVideos = videosByApp.get(item.id) ?? [];
          return (
            <View style={styles.card}>
              <Text style={styles.project}>{project}</Text>
              <Text style={styles.actor}>
                {actor}
                {role ? ` · ${role}` : ''}
              </Text>
              <Text style={styles.status}>{t(`status.${item.status}` as any)}</Text>
              {!item.accept_budget && item.counter_budget != null ? (
                <Text style={styles.offer}>
                  {t('admin.budgetOffers')}: {item.counter_budget.toLocaleString('tr-TR')} TRY
                </Text>
              ) : null}
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

              {appVideos.length > 0 ? (
                <Text style={styles.videoLabel}>
                  {t('admin.auditionVideos')}: {appVideos.length}
                </Text>
              ) : (
                <Text style={styles.noVideo}>{t('admin.noAuditionVideo')}</Text>
              )}

              <Button
                label={t('admin.details')}
                onPress={() => router.push(`/(admin)/applications/${item.id}`)}
                style={{ marginTop: Spacing.sm }}
              />
              <View style={styles.actions}>
                <Button
                  label={t('status.shortlisted')}
                  variant="secondary"
                  onPress={() => setStatus(item.id, 'shortlisted')}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('status.audition_invited')}
                  onPress={() => setStatus(item.id, 'audition_invited')}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          );
        }}
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  project: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.ink },
  actor: { fontFamily: Fonts.body, color: Colors.textMuted, fontSize: 14 },
  status: { fontFamily: Fonts.bodyMedium, color: Colors.goldDeep, marginTop: 4 },
  offer: { fontFamily: Fonts.body, color: Colors.goldDeep },
  note: { fontFamily: Fonts.body, color: Colors.textMuted, fontSize: 13 },
  videoLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.ink,
    marginTop: Spacing.sm,
  },
  noVideo: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
