import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localizedError } from '@/lib/authErrors';
import { InboxBell } from '@/components/ui/InboxBell';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { RegistrationSteps } from '@/components/ui/RegistrationSteps';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCasts } from '@/lib/access';
import { appLang } from '@/lib/i18n';
import { pickFromLibrary } from '@/lib/pickMedia';
import { fetchMyCastOptions, fetchMyIntroducedCastIds, fetchPublishedCasts } from '@/services/casts';
import { recordAndUploadVideo } from '@/services/videos';
import { supabase } from '@/lib/supabase';
import type { Announcement, CastListing, CastOptionStatus } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user, profile, actorProfile, galleryPhotos, refreshProfile } = useAuth();
  const router = useRouter();
  const [casts, setCasts] = useState<CastListing[]>([]);
  const [introducedIds, setIntroducedIds] = useState<Set<string>>(new Set());
  const [optionByCast, setOptionByCast] = useState<Map<string, CastOptionStatus>>(new Map());
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void refreshProfile();
      (async () => {
        try {
          const [c, a, introIds, optionRows] = await Promise.all([
            castOk
              ? fetchPublishedCasts()
              : Promise.resolve([] as CastListing[]),
            supabase
              .from('announcements')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(3)
              .then((r) => (r.data as Announcement[]) ?? []),
            user && castOk
              ? fetchMyIntroducedCastIds(user.id)
              : Promise.resolve([] as string[]),
            user && castOk
              ? fetchMyCastOptions(user.id)
              : Promise.resolve([] as { cast_id: string; status: CastOptionStatus }[]),
          ]);
          if (!active) return;
          setCasts(c.slice(0, 3));
          setAnnouncements(a);
          setIntroducedIds(new Set(introIds));
          setOptionByCast(new Map(optionRows.map((r) => [r.cast_id, r.status])));
        } catch {
          // ignore offline / unset env during scaffold
        }
      })();
      return () => {
        active = false;
      };
    }, [castOk, refreshProfile, user])
  );

  return (
    <Screen scroll>
      <LinearGradient />
      <View style={styles.topRow}>
        <View style={styles.topCopy}>
          <Text style={styles.brand} numberOfLines={2}>
            {t('brand')}
          </Text>
          <Text style={styles.hello}>
            {t('home.hello')}, {profile?.full_name?.split(' ')[0] || '—'}
          </Text>
        </View>
        <InboxBell />
      </View>

      {actorProfile?.registration_completed_at ? (
        <>
          <AccessGateCard compact />
          <MediaAccessCard compact />
        </>
      ) : (
        <RegistrationSteps />
      )}

      {!actorProfile?.intro_video_playback_url ? (
        <Pressable
          style={({ pressed }) => [styles.introCard, pressed && { opacity: 0.93 }]}
          onPress={() => {
            Alert.alert(t('home.introCta'), undefined, [
              {
                text: t('media.takeNow'),
                onPress: () => router.push('/record/intro'),
              },
              {
                text: t('media.pickFromGallery'),
                onPress: () => {
                  if (!user) return;
                  void (async () => {
                    try {
                      const asset = await pickFromLibrary('videos', 30);
                      if (!asset) return;
                      await recordAndUploadVideo({
                        localUri: asset.uri,
                        userId: user.id,
                        kind: 'intro',
                        title: 'Tanıtım',
                      });
                      await refreshProfile();
                      Alert.alert(t('common.success'));
                    } catch (e: any) {
                      Alert.alert(t('common.error'), localizedError(t, e));
                    }
                  })();
                },
              },
              { text: t('common.cancel'), style: 'cancel' },
            ]);
          }}
        >
          <Text style={styles.introTitle}>{t('home.introCta')}</Text>
          <Text style={styles.introHint}>{t('home.introHint')}</Text>
        </Pressable>
      ) : null}

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
              {optionByCast.get(c.id) === 'pending' ? (
                <Text style={styles.castIntro}>{t('cast.optionChipPending')}</Text>
              ) : optionByCast.get(c.id) === 'accepted' ? (
                <Text style={styles.castIntro}>{t('cast.optionChipYes')}</Text>
              ) : optionByCast.get(c.id) === 'declined' ? (
                <Text style={styles.castIntro}>{t('cast.optionChipNo')}</Text>
              ) : null}
              {introducedIds.has(c.id) ? (
                <Text style={styles.castIntro}>{t('cast.introduced')}</Text>
              ) : null}
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Pressable onPress={() => router.push('/(actor)/announcements')}>
            <Text style={styles.sectionTitle}>{t('home.announcements')}</Text>
          </Pressable>
          {announcements.length > 0 ? (
            <Pressable onPress={() => router.push('/(actor)/announcements')}>
              <Text style={styles.link}>{t('common.continue')}</Text>
            </Pressable>
          ) : null}
        </View>
        {announcements.length === 0 ? (
          <Text style={styles.empty}>{t('home.noAnnouncements')}</Text>
        ) : (
          announcements.slice(0, 3).map((a) => (
            <Pressable
              key={a.id}
              style={({ pressed }) => [styles.announce, pressed && { opacity: 0.85 }]}
              onPress={() =>
                router.push({ pathname: '/(actor)/announcements', params: { id: a.id } })
              }
            >
              <Text style={styles.announceTitle} numberOfLines={1}>
                {appLang(i18n.language) === 'en' ? a.title_en : a.title_tr}
              </Text>
              <Text style={styles.announceBody} numberOfLines={2}>
                {appLang(i18n.language) === 'en' ? a.body_en : a.body_tr}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      {castOk ? (
        <Pressable
          onPress={() => router.push('/(actor)/applications')}
          style={({ pressed }) => [styles.appsCard, pressed && { opacity: 0.92 }]}
        >
          <Ionicons name="documents-outline" size={22} color={Colors.textOnDark} />
          <Text style={styles.appsTitle}>{t('home.applications')}</Text>
          <Ionicons name="chevron-forward" size={22} color={Colors.textOnDark} />
        </Pressable>
      ) : null}

      <View style={{ marginTop: Spacing.lg }}>
        <WhatsAppButton />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  topCopy: { flex: 1, paddingRight: Spacing.sm },
  brand: {
    fontFamily: Fonts.displayBold,
    fontSize: 44,
    color: Colors.ink,
  },
  hello: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 4,
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
  castIntro: {
    marginTop: 4,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.brandDeep,
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
  appsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    minHeight: 56,
  },
  appsTitle: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.textOnDark,
  },
});
