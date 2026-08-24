import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { fetchActorsAdmin, setActorStatus } from '@/services/actors';
import { supabase } from '@/lib/supabase';
import type { ActorStatus, Profile } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { AdminPermGate } from '@/components/ui/AdminPermGate';

const FILTERS: ActorStatus[] = ['approved', 'pending', 'rejected'];

function formatBadgeCount(n: number) {
  if (n <= 0) return null;
  if (n > 100) return '+99';
  return String(n);
}

export default function AdminActorsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState<ActorStatus>('approved');
  const [items, setItems] = useState<Profile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const loadPendingCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'actor')
      .eq('actor_status', 'pending');
    if (!error) setPendingCount(count ?? 0);
  }, []);

  const load = useCallback(() => {
    fetchActorsAdmin(filter)
      .then(setItems)
      .catch(() => setItems([]));
    loadPendingCount().catch(() => undefined);
  }, [filter, loadPendingCount]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const act = async (id: string, status: ActorStatus) => {
    try {
      await setActorStatus(id, status);
      load();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message);
    }
  };

  const pendingBadge = formatBadgeCount(pendingCount);

  return (
    <AdminPermGate perm="actors">
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>{t('admin.actors')}</Text>
      <View style={styles.filters}>
        {FILTERS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilter(s)}
            style={[styles.chip, filter === s && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>
              {t(`status.${s}`)}
            </Text>
            {s === 'pending' && pendingBadge ? (
              <View style={[styles.badge, filter === s && styles.badgeOnActive]}>
                <Text style={styles.badgeText}>{pendingBadge}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('admin.noActorsInFilter')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => router.push(`/(admin)/actors/${item.id}`)}>
              <Text style={styles.name}>{item.full_name || item.email}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </Pressable>
            {item.actor_status === 'pending' ? (
              <View style={styles.actions}>
                <Button
                  label={t('admin.approve')}
                  onPress={() => act(item.id, 'approved')}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('admin.reject')}
                  variant="danger"
                  onPress={() => act(item.id, 'rejected')}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
    </AdminPermGate>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    paddingHorizontal: Spacing.lg,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipText: { fontFamily: Fonts.bodyMedium, color: Colors.text },
  chipTextActive: { color: Colors.textOnDark },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOnActive: {
    backgroundColor: Colors.gold,
  },
  badgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.white,
  },
  empty: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  name: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.ink },
  email: { fontFamily: Fonts.body, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: Spacing.sm },
});
