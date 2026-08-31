import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { IntroVideoCard } from '@/components/video/IntroVideoCard';
import { useAuth } from '@/contexts/AuthContext';
import { LANG_INTRO_MAX, pickLangIntroThen } from '@/lib/langIntro';
import { anyOptionList, optionLabel } from '@/lib/optionLabel';
import {
  ALL_PHOTO_KINDS,
  photosByKind,
  deleteGalleryPhoto,
  upsertGalleryPhoto,
  type GalleryPhotoKind,
} from '@/services/gallery';
import {
  clearProfileVideo,
  deleteOwnVideo,
  fetchLangIntroVideos,
  type ProfileVideoKind,
} from '@/services/videos';
import type { Video } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const PROFILE_VIDEOS: {
  kind: ProfileVideoKind;
  route: '/record/intro' | '/record/mimic' | '/record/showreel' | '/record/talent';
  urlKey:
    | 'intro_video_playback_url'
    | 'mimic_video_playback_url'
    | 'showreel_playback_url'
    | 'talent_video_playback_url';
  idKey: 'intro_video_id' | 'mimic_video_id' | 'showreel_video_id' | 'talent_video_id';
}[] = [
  {
    kind: 'intro',
    route: '/record/intro',
    urlKey: 'intro_video_playback_url',
    idKey: 'intro_video_id',
  },
  {
    kind: 'mimic',
    route: '/record/mimic',
    urlKey: 'mimic_video_playback_url',
    idKey: 'mimic_video_id',
  },
  {
    kind: 'showreel',
    route: '/record/showreel',
    urlKey: 'showreel_playback_url',
    idKey: 'showreel_video_id',
  },
  {
    kind: 'talent',
    route: '/record/talent',
    urlKey: 'talent_video_playback_url',
    idKey: 'talent_video_id',
  },
];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { profile, actorProfile, galleryPhotos, user, refreshProfile } = useAuth();
  const router = useRouter();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [langVideos, setLangVideos] = useState<Video[]>([]);
  const [photoBusy, setPhotoBusy] = useState<GalleryPhotoKind | null>(null);
  const showAvatar = Boolean(profile?.avatar_url) && !avatarFailed;
  const photoMap = useMemo(() => photosByKind(galleryPhotos), [galleryPhotos]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatar_url]);

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      if (!user) return;
      void fetchLangIntroVideos(user.id)
        .then(setLangVideos)
        .catch(() => setLangVideos([]));
    }, [user, refreshProfile])
  );

  const pickPhoto = async (kind: GalleryPhotoKind) => {
    if (!user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;
      setPhotoBusy(kind);
      await upsertGalleryPhoto({
        userId: user.id,
        kind,
        localUri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType,
      });
      await refreshProfile();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setPhotoBusy(null);
    }
  };

  const removePhoto = (kind: GalleryPhotoKind) => {
    if (!user) return;
    Alert.alert(t('profile.deletePhotoTitle'), t('profile.deletePhotoBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setPhotoBusy(kind);
              await deleteGalleryPhoto(user.id, kind);
              await refreshProfile();
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message ?? t('common.error'));
            } finally {
              setPhotoBusy(null);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.cover}>
        {profile?.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={StyleSheet.absoluteFill} />
        ) : null}
      </View>
      <View style={styles.avatarWrap}>
        {showAvatar ? (
          <Image
            source={{ uri: profile!.avatar_url! }}
            style={styles.avatar}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.initials}>
              {(profile?.full_name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.name}>{profile?.full_name}</Text>
      <Text style={styles.city}>{actorProfile?.city ?? '—'}</Text>

      <Button
        label={t('profile.edit')}
        variant="secondary"
        onPress={() => router.push('/(actor)/profile/edit')}
        style={{ marginTop: Spacing.sm }}
      />
      <Button
        label={t('profile.editRegistration')}
        variant="ghost"
        onPress={() => router.push('/(auth)/registration-form')}
        style={{ marginTop: Spacing.xs }}
      />
      <Button
        label={t('profile.editMedia')}
        variant="ghost"
        onPress={() => router.push('/(actor)/media')}
        style={{ marginTop: Spacing.xs }}
      />
      <Text style={styles.manageHint}>{t('profile.manageHint')}</Text>

      <Section title={t('profile.physical')}>
        <Row label={t('profile.height')} value={actorProfile?.height_cm?.toString()} />
        <Row label={t('profile.weight')} value={actorProfile?.weight_kg?.toString()} />
        <Row label={t('profile.hair')} value={optionLabel(t, 'hair', actorProfile?.hair_color)} />
        <Row label={t('profile.eyes')} value={optionLabel(t, 'eyes', actorProfile?.eye_color)} />
        <Row label={t('profile.shoe')} value={actorProfile?.shoe_size} />
        <Row label={t('profile.body')} value={actorProfile?.body_size} />
        <Row label={t('profile.education')} value={optionLabel(t, 'education', actorProfile?.education)} />
        <Row
          label={t('regForm.fields.profession')}
          value={optionLabel(t, 'profession', actorProfile?.profession)}
        />
      </Section>

      <Section title={t('profile.bio')}>
        <Text style={styles.block}>{actorProfile?.bio || '—'}</Text>
      </Section>

      <Section title={t('profile.experience')}>
        <Text style={styles.block}>{actorProfile?.experience || '—'}</Text>
      </Section>

      <Section title={t('profile.skills')}>
        <Text style={styles.block}>{anyOptionList(t, actorProfile?.skills)}</Text>
      </Section>

      <Section title={t('profile.gallery')}>
        {ALL_PHOTO_KINDS.map((kind) => {
          const photo = photoMap[kind];
          return (
            <View key={kind} style={styles.mediaCard}>
              <Text style={styles.mediaTitle}>{t(`media.photos.${kind}`)}</Text>
              {photo ? (
                <Image
                  source={{ uri: photo.public_url }}
                  style={styles.galleryThumb}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.missing}>{t('media.missing')}</Text>
              )}
              <Button
                label={photo ? t('media.changePhoto') : t('media.uploadPhoto')}
                variant="secondary"
                loading={photoBusy === kind}
                onPress={() => void pickPhoto(kind)}
              />
              {photo ? (
                <Button
                  label={t('common.delete')}
                  variant="danger"
                  loading={photoBusy === kind}
                  onPress={() => removePhoto(kind)}
                />
              ) : null}
            </View>
          );
        })}
      </Section>

      <Section title={t('profile.videos')}>
        {PROFILE_VIDEOS.map((item) => {
          const title = t(`media.videos.${item.kind}`);
          return (
            <View key={item.kind} style={styles.videoBlock}>
              <Text style={styles.mediaTitle}>{title}</Text>
              <IntroVideoCard
                playbackUrl={actorProfile?.[item.urlKey]}
                videoId={actorProfile?.[item.idKey]}
                title={title}
                canManage
                changeLabel={t('media.changePhoto')}
                emptyText={t('profile.noVideo')}
                onChange={() => router.push(item.route)}
                onDelete={async () => {
                  if (!user) return;
                  await clearProfileVideo(user.id, item.kind);
                  await refreshProfile();
                }}
              />
            </View>
          );
        })}
        {langVideos.map((video, index) => {
          const title = video.title || t('media.videos.langIntroSlot', { n: index + 1 });
          return (
            <View key={video.id} style={styles.videoBlock}>
              <Text style={styles.mediaTitle}>{title}</Text>
              <IntroVideoCard
                playbackUrl={video.playback_url}
                videoId={video.cf_uid ?? video.id}
                title={title}
                canManage
                changeLabel={t('media.changePhoto')}
                onChange={() =>
                  pickLangIntroThen(t, i18n.language, actorProfile?.languages, (lang) => {
                    router.push({
                      pathname: '/record/lang_intro',
                      params: { replaceId: video.id, ...(lang ? { lang } : {}) },
                    } as any);
                  })
                }
                onDelete={async () => {
                  if (!user) return;
                  await deleteOwnVideo(user.id, video.id);
                  setLangVideos((prev) => prev.filter((row) => row.id !== video.id));
                  await refreshProfile();
                }}
              />
            </View>
          );
        })}
        {langVideos.length < LANG_INTRO_MAX ? (
          <Button
            label={t('media.videos.langIntroAdd')}
            variant="secondary"
            onPress={() =>
              pickLangIntroThen(t, i18n.language, actorProfile?.languages, (lang) => {
                router.push({
                  pathname: '/record/lang_intro',
                  params: lang ? { lang } : {},
                } as any);
              })
            }
          />
        ) : null}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 140,
    marginHorizontal: -Spacing.lg,
    backgroundColor: Colors.inkSoft,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarWrap: { marginTop: -40, marginBottom: Spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.paper,
    backgroundColor: Colors.paperMuted,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.textOnDark,
  },
  name: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
  },
  city: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  manageHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  section: { marginTop: Spacing.xl, gap: Spacing.sm },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontFamily: Fonts.body, color: Colors.textMuted },
  rowValue: { fontFamily: Fonts.bodyMedium, color: Colors.text },
  block: {
    fontFamily: Fonts.body,
    color: Colors.text,
    lineHeight: 22,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mediaCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  mediaTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.text,
  },
  missing: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  galleryThumb: {
    width: '100%',
    height: 180,
    borderRadius: Radius.sm,
    backgroundColor: Colors.paperMuted,
  },
  videoBlock: { gap: Spacing.sm },
});
