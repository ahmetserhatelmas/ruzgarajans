import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { IntroVideoCard } from '@/components/video/IntroVideoCard';
import { fetchActorDetail } from '@/services/actors';
import type { ActorProfile, Profile } from '@/types/database';
import { optionLabel } from '@/lib/optionLabel';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function AdminActorDetail() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actor, setActor] = useState<ActorProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchActorDetail(id).then(({ profile: p, actor: a }) => {
      setProfile(p);
      setActor(a);
    });
  }, [id]);

  const backHref =
    typeof returnTo === 'string' && returnTo.length > 0
      ? returnTo
      : '/(admin)/actors';

  return (
    <Screen scroll>
      <BackHeader fallbackHref={backHref} />
      <Text style={styles.title}>{profile?.full_name}</Text>
      <Text style={styles.meta}>{profile?.email}</Text>
      <Text style={styles.meta}>
        {t('cast.status')}: {profile ? t(`status.${profile.actor_status}` as any) : '—'}
      </Text>
      <Text style={styles.section}>{t('profile.physical')}</Text>
      <Text style={styles.line}>
        {t('profile.height')}: {actor?.height_cm ?? '—'} · {t('profile.hair')}:{' '}
        {optionLabel(t, 'hair', actor?.hair_color)} · {t('profile.eyes')}:{' '}
        {optionLabel(t, 'eyes', actor?.eye_color)}
      </Text>
      <Text style={styles.section}>{t('profile.bio')}</Text>
      <Text style={styles.line}>{actor?.bio || '—'}</Text>
      <Text style={styles.section}>{t('profile.introVideo')}</Text>
      <IntroVideoCard
        playbackUrl={actor?.intro_video_playback_url}
        videoId={actor?.intro_video_id}
        title={`${profile?.full_name ?? ''} · ${t('profile.introVideo')}`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    marginTop: Spacing.md,
  },
  meta: { fontFamily: Fonts.body, color: Colors.textMuted, marginBottom: 4 },
  section: {
    fontFamily: Fonts.bodyBold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  line: { fontFamily: Fonts.body, color: Colors.text, lineHeight: 22 },
});
