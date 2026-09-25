import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/ui/BackHeader';
import { appLang } from '@/lib/i18n';
import { fetchAnnouncements } from '@/services/announcements';
import type { Announcement } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

function localeOf(lang: string) {
  return appLang(lang) === 'en' ? 'en-GB' : 'tr-TR';
}

function AnnouncementCard({ item, lang }: { item: Announcement; lang: string }) {
  const en = appLang(lang) === 'en';
  const date = new Date(item.created_at);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{en ? item.title_en : item.title_tr}</Text>
      {Number.isFinite(date.getTime()) ? (
        <Text style={styles.cardDate}>{date.toLocaleDateString(localeOf(lang))}</Text>
      ) : null}
      <Text style={styles.cardBody}>{en ? item.body_en : item.body_tr}</Text>
    </View>
  );
}

export default function AnnouncementsScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [items, setItems] = useState<Announcement[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchAnnouncements()
        .then((rows) => {
          if (active) setItems(rows);
        })
        .catch(() => {
          if (active) setItems([]);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const featured = useMemo(
    () => (id ? items.find((row) => row.id === id) ?? null : null),
    [id, items]
  );
  const rest = useMemo(
    () => (featured ? items.filter((row) => row.id !== featured.id) : items),
    [featured, items]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <BackHeader fallbackHref="/(actor)" />
      </View>
      <Text style={styles.title}>{t('home.announcements')}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {items.length === 0 ? (
          <Text style={styles.empty}>{t('home.noAnnouncements')}</Text>
        ) : (
          <>
            {featured ? <AnnouncementCard item={featured} lang={i18n.language} /> : null}
            {featured && rest.length ? (
              <Text style={styles.other}>{t('home.otherAnnouncements')}</Text>
            ) : null}
            {rest.map((row) => (
              <AnnouncementCard key={row.id} item={row} lang={i18n.language} />
            ))}
          </>
        )}
      </ScrollView>
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
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.ink,
  },
  cardDate: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  cardBody: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  other: {
    marginTop: Spacing.sm,
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.text,
  },
  empty: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
});
