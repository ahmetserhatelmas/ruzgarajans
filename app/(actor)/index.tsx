import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { RegistrationSteps } from '@/components/ui/RegistrationSteps';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCasts } from '@/lib/access';
import { fetchPublishedCasts } from '@/services/casts';
import { supabase } from '@/lib/supabase';
import type { Announcement, CastListing } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { profile, actorProfile, galleryPhotos, refreshProfile } = useAuth();
  const router = useRouter();
  const [casts, setCasts] = useState<CastListing[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void refreshProfile();
      (async () => {
        try {
          const [c, a] = await Promise.all([
            castOk
              ? fetchPublishedCasts()
              : Promise.resolve([] as CastListing[]),
            supabase
              .from('announcements')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(3)
              .then((r) => (r.data as Announcement[]) ?? []),
          ]);
          if (!active) return;
          setCasts(c.slice(0, 3));
          setAnnouncements(a);
        } catch {
          // ignore offline / unset env during scaffold
        }
      })();
      return () => {
        active = false;
      };
    }, [castOk, refreshProfile])
  );

  return (
    <Screen scroll>
      <LinearGradient />
      <Text style={styles.brand}>{t('brand')}</Text>
      <Text style={styles.hello}>
        {t('home.hello')}, {profile?.full_name?.split(' ')[0] || '—'}
      </Text>

      {actorProfile?.registration_completed_at ? (
        <>
          <AccessGateCard compact />
          <MediaAccessCard compact />
        </>
      ) : (
        <RegistrationSteps />
      )}

      <Pressable
        style={({ pressed }) => [styles.introCard, pressed && { opacity: 0.93 }]}
        onPress={() => router.push('/record/intro')}
      >
        <Text style={styles.introTitle}>{t('home.introCta')}</Text>
        <Text style={styles.introHint}>{t('home.introHint')}</Text>
      </Pressable>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('home.openCasts')}</Text>
          {castOk ? (
            <Pressable onPress={() => router.push('/(actor)/cast')}>
              <Text style={styles.link}>{t('common.continue')}</Text>
            </Pressable>
          ) : null}
        </View>
        {!castOk ? (
          <Text style={styles.empty}>{t('access.castLocked')}</Text>
        ) : casts.length === 0 ? (
          <Text style={styles.empty}>{t('cast.empty')}</Text>
        ) : (
          casts.map((c) => (
            <Pressable
              key={c.id}
              style={styles.castRow}
              onPress={() => router.push(`/(actor)/cast/${c.id}`)}
            >
              <Text style={styles.castName}>{c.project_name}</Text>
              <Text style={styles.castRole}>{c.role_name}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.announcements')}</Text>
        {announcements.length === 0 ? (
          <Text style={styles.empty}>—</Text>
        ) : (
          announcements.map((a) => (
            <View key={a.id} style={styles.announce}>
              <Text style={styles.announceTitle}>
                {i18n.language === 'en' ? a.title_en : a.title_tr}
              </Text>
              <Text style={styles.announceBody} numberOfLines={3}>
                {i18n.language === 'en' ? a.body_en : a.body_tr}
              </Text>
            </View>
          ))
        )}
      </View>

      {castOk ? (
        <Pressable
          onPress={() => router.push('/(actor)/applications')}
          style={styles.appsLink}
        >
          <Text style={styles.link}>{t('home.applications')}</Text>
        </Pressable>
      ) : null}

      <View style={{ marginTop: Spacing.lg }}>
        <WhatsAppButton />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontFamily: Fonts.displayBold,
    fontSize: 44,
    color: Colors.ink,
    marginTop: Spacing.md,
  },
  hello: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  introCard: {
    backgroundColor: Colors.brand,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  introTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.textOnDark,
  },
  introHint: {
    marginTop: Spacing.sm,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textOnDark,
    lineHeight: 22,
  },
  section: { marginBottom: Spacing.xl, gap: Spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.text,
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.goldDeep,
    fontSize: 14,
  },
  empty: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  castRow: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  castName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.ink,
  },
  castRole: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  announce: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  announceTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.text,
  },
  announceBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  appsLink: { marginBottom: Spacing.md },
});
