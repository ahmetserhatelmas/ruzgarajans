import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/ui/BackHeader';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
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
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);

  useFocusEffect(
    useCallback(() => {
      if (!user || !castOk) {
        setItems([]);
        return;
      }
      supabase
        .from('applications')
        .select(
          'id, cast_id, status, accept_budget, counter_budget, cast_listings(project_name, role_name)'
        )
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setItems((data as unknown as AppRow[]) ?? []))
        .catch(() => setItems([]));
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
            </Pressable>
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
});
