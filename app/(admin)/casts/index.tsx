import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { fetchAllCastsAdmin, setCastPublished } from '@/services/casts';
import type { CastListing } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function AdminCastsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<CastListing[]>([]);

  const load = useCallback(() => {
    fetchAllCastsAdmin()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('admin.casts')}</Text>
        <Button label={t('admin.newCast')} onPress={() => router.push('/(admin)/casts/new')} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text
              style={styles.name}
              onPress={() => router.push(`/(admin)/casts/${item.id}`)}
            >
              {item.project_name}
            </Text>
            <Text style={styles.role}>{item.role_name}</Text>
            <Text style={styles.meta}>
              {item.is_published ? t('admin.published') : t('admin.draft')}
            </Text>
            <View style={styles.actions}>
              <Button
                label={t('common.edit')}
                variant="secondary"
                style={styles.actionBtn}
                onPress={() => router.push(`/(admin)/casts/${item.id}`)}
              />
              <Button
                label={item.is_published ? t('admin.unpublish') : t('admin.publish')}
                variant={item.is_published ? 'ghost' : 'primary'}
                style={styles.actionBtn}
                onPress={async () => {
                  await setCastPublished(item.id, !item.is_published);
                  load();
                }}
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  head: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  name: { fontFamily: Fonts.bodyBold, fontSize: 18, color: Colors.ink },
  role: { fontFamily: Fonts.body, color: Colors.goldDeep },
  meta: { fontFamily: Fonts.body, color: Colors.textMuted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: { flex: 1 },
});
