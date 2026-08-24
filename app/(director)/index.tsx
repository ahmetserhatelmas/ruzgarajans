import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMyActorShares, type DirectorShareRow } from '@/services/shares';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function DirectorHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [rows, setRows] = useState<DirectorShareRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchMyActorShares()
        .then((next) => {
          if (!cancelled) setRows(next);
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message ?? t('common.error'));
        });
      return () => {
        cancelled = true;
      };
    }, [t])
  );

  return (
    <Screen scroll contentStyle={{ gap: Spacing.md, paddingTop: Spacing.md }}>
      <Text style={styles.brand}>{t('brand')}</Text>
      <Text style={styles.title}>{t('director.title')}</Text>
      <Text style={styles.sub}>{profile?.email}</Text>
      <Text style={styles.hint}>{t('director.hint')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {rows.length === 0 && !error ? (
        <Text style={styles.empty}>{t('director.empty')}</Text>
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push(`/(director)/${row.actor_id}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            {row.actor?.avatar_url ? (
              <Image source={{ uri: row.actor.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]} />
            )}
            <View style={styles.meta}>
              <Text style={styles.name}>{row.actor?.full_name || t('director.actor')}</Text>
              <Text style={styles.date}>
                {new Date(row.created_at).toLocaleDateString()}
              </Text>
            </View>
          </Pressable>
        ))
      )}
      <Button title={t('common.logout')} variant="outline" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontFamily: Fonts.display, fontSize: 28, color: Colors.ink },
  title: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.text },
  sub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted },
  hint: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  empty: { fontFamily: Fonts.body, fontSize: 15, color: Colors.textMuted, marginVertical: Spacing.lg },
  error: { fontFamily: Fonts.body, fontSize: 14, color: Colors.danger },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.paperMuted },
  avatarEmpty: { backgroundColor: Colors.border },
  meta: { flex: 1 },
  name: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.text },
  date: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});
