import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { IntroVideoCard } from '@/components/video/IntroVideoCard';
import { fetchSharedActorDetail } from '@/services/shares';
import type { ActorProfile, Profile, Video } from '@/types/database';
import type { GalleryPhoto } from '@/services/gallery';
import { optionLabel } from '@/lib/optionLabel';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

function Line({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Text style={styles.line}>
      {label}: {value || '—'}
    </Text>
  );
}

export default function DirectorActorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actor, setActor] = useState<ActorProfile | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchSharedActorDetail(id).then(({ profile: p, actor: a, photos: ph, videos: v }) => {
      setProfile(p);
      setActor(a);
      setPhotos(ph);
      setVideos(v);
    });
  }, [id]);

  return (
    <Screen scroll contentStyle={{ gap: Spacing.sm, paddingTop: Spacing.md }}>
      <BackHeader fallbackHref="/(director)" />
      <Text style={styles.title}>{profile?.full_name || t('director.actor')}</Text>
      <Line label={t('regForm.fields.email')} value={profile?.email} />
      <Line label={t('regForm.fields.phone')} value={profile?.phone} />
      <Line label={t('regForm.fields.whatsapp')} value={actor?.whatsapp} />
      <Line label={t('regForm.fields.nationality')} value={actor?.nationality} />
      <Line label={t('regForm.fields.birthDate')} value={actor?.birth_date} />
      <Line label={t('regForm.fields.birthPlace')} value={actor?.birth_place} />
      <Line label={t('regForm.fields.height')} value={actor?.height_cm} />
      <Line label={t('regForm.fields.weight')} value={actor?.weight_kg} />
      <Line label={t('regForm.fields.hair')} value={optionLabel(t, 'hair', actor?.hair_color)} />
      <Line label={t('regForm.fields.eyes')} value={optionLabel(t, 'eyes', actor?.eye_color)} />
      <Line label={t('regForm.fields.experience')} value={actor?.experience} />
      <Line label={t('regForm.fields.drivingInfo')} value={actor?.driving_info} />
      <Line
        label={t('regForm.sections.insurance')}
        value={optionLabel(t, 'insurance', actor?.insurance_status)}
      />

      <Text style={styles.section}>{t('director.photos')}</Text>
      {photos.map((p) => (
        <Image key={p.id} source={{ uri: p.public_url }} style={styles.photo} />
      ))}

      <Text style={styles.section}>{t('director.videos')}</Text>
      <IntroVideoCard
        playbackUrl={actor?.intro_video_playback_url}
        videoId={actor?.intro_video_id}
        title={t('media.videos.intro')}
      />
      <IntroVideoCard
        playbackUrl={actor?.mimic_video_playback_url}
        videoId={actor?.mimic_video_id}
        title={t('media.videos.mimic')}
      />
      <IntroVideoCard
        playbackUrl={actor?.showreel_playback_url}
        videoId={actor?.showreel_video_id}
        title={t('media.videos.showreel')}
      />
      {videos
        .filter((v) => v.playback_url)
        .map((v) => (
          <IntroVideoCard
            key={v.id}
            playbackUrl={v.playback_url}
            videoId={v.cf_uid ?? v.id}
            title={v.kind ?? t('director.videos')}
          />
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    color: Colors.ink,
  },
  section: {
    fontFamily: Fonts.bodyBold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  line: { fontFamily: Fonts.body, color: Colors.text, lineHeight: 22 },
  photo: {
    width: '100%',
    height: 280,
    borderRadius: Radius.md,
    backgroundColor: Colors.paperMuted,
    marginBottom: Spacing.sm,
  },
});
