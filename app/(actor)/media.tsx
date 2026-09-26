import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { localizedError } from '@/lib/authErrors';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { MediaSourceButtons } from '@/components/ui/MediaSourceButtons';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_PHOTO_KINDS,
  FAVORITE_PHOTO_KINDS,
  OPTIONAL_PHOTO_KINDS,
  deleteGalleryPhoto,
  fetchGalleryPhotos,
  photosByKind,
  upsertGalleryPhoto,
  type GalleryPhoto,
  type GalleryPhotoKind,
} from '@/services/gallery';
import { updateActorProfile } from '@/services/actors';
import { hasRequiredGalleryMedia } from '@/lib/access';
import { LANG_INTRO_KIND, LANG_INTRO_MAX, pickLangIntroThen } from '@/lib/langIntro';
import {
  clearProfileVideo,
  deleteOwnVideo,
  fetchLangIntroVideos,
  recordAndUploadVideo,
} from '@/services/videos';
import type { Video, VideoKind } from '@/types/database';
import { pickFromLibrary, takePhoto } from '@/lib/pickMedia';
import { PhotoExample } from '@/components/ui/PhotoExample';
import { IntroVideoCard } from '@/components/video/IntroVideoCard';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const PROFILE_VIDEO_KEYS = {
  intro: { url: 'intro_video_playback_url', id: 'intro_video_id' },
  mimic: { url: 'mimic_video_playback_url', id: 'mimic_video_id' },
  showreel: { url: 'showreel_playback_url', id: 'showreel_video_id' },
  talent: { url: 'talent_video_playback_url', id: 'talent_video_id' },
} as const;

const CARD_PHOTO_KINDS: GalleryPhotoKind[] = [
  'full_body',
  'model_pose',
  'chest',
];
const CARD_PHOTO_SET = new Set<GalleryPhotoKind>(CARD_PHOTO_KINDS);
const FAVORITE_PHOTO_SET = new Set<GalleryPhotoKind>(FAVORITE_PHOTO_KINDS);
const OPTIONAL_PHOTO_SET = new Set<string>(OPTIONAL_PHOTO_KINDS);
const OTHER_PHOTO_KINDS = ALL_PHOTO_KINDS.filter(
  (kind) => !CARD_PHOTO_SET.has(kind) && !FAVORITE_PHOTO_SET.has(kind)
);
const CARD_PHOTO_BORDER = '#2563EB';

function reqLabel(label: string) {
  return `${label} *`;
}

function PhotoPreview({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(3 / 4);

  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) setRatio(width / height);
      },
      () => undefined
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <Image
      source={{ uri }}
      style={[styles.thumb, { aspectRatio: ratio }]}
      resizeMode="contain"
    />
  );
}

export default function MediaScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, actorProfile, refreshProfile } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [langVideos, setLangVideos] = useState<Video[]>([]);
  const [photoBusy, setPhotoBusy] = useState<GalleryPhotoKind | null>(null);
  const [videoBusy, setVideoBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const photoMap = useMemo(() => photosByKind(photos), [photos]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshProfile();
      void fetchGalleryPhotos(user.id)
        .then(setPhotos)
        .catch(() => undefined);
      void fetchLangIntroVideos(user.id)
        .then(setLangVideos)
        .catch(() => setLangVideos([]));
    }, [user, refreshProfile])
  );

  const savePickedPhoto = async (
    kind: GalleryPhotoKind,
    asset: { uri: string; mimeType?: string | null }
  ) => {
    if (!user) return;
    try {
      setPhotoBusy(kind);
      const saved = await upsertGalleryPhoto({
        userId: user.id,
        kind,
        localUri: asset.uri,
        mimeType: asset.mimeType,
      });
      setPhotos((prev) => {
        const rest = prev.filter((p) => p.kind !== kind);
        return [...rest, saved];
      });
      await refreshProfile();
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setPhotoBusy(null);
    }
  };

  const takeNowPhoto = (kind: GalleryPhotoKind) => {
    void takePhoto().then((asset) => {
      if (asset) void savePickedPhoto(kind, asset);
    });
  };

  const pickPhotoFromGallery = (kind: GalleryPhotoKind) => {
    void pickFromLibrary('images').then((asset) => {
      if (asset) void savePickedPhoto(kind, asset);
    });
  };

  const pickProfileVideo = async (
    kind: VideoKind,
    title: string,
    replaceVideoId?: string
  ) => {
    if (!user) return;
    try {
      const asset = await pickFromLibrary('videos');
      if (!asset) return;
      setVideoBusy(replaceVideoId ?? kind);
      await recordAndUploadVideo({
        localUri: asset.uri,
        userId: user.id,
        kind,
        title,
        replaceVideoId,
      });
      if (kind === 'lang_intro') {
        const next = await fetchLangIntroVideos(user.id);
        setLangVideos(next);
      }
      await refreshProfile();
      Alert.alert(t('common.success'));
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setVideoBusy(null);
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
              setPhotos((prev) => prev.filter((p) => p.kind !== kind));
              await refreshProfile();
            } catch (e: any) {
              Alert.alert(t('common.error'), localizedError(t, e));
            } finally {
              setPhotoBusy(null);
            }
          })();
        },
      },
    ]);
  };

  const onSave = async () => {
    if (!user) return;
    const approved = profile?.actor_status === 'approved';
    if (!approved && !hasRequiredGalleryMedia(actorProfile, photos)) {
      Alert.alert(t('common.error'), t('regForm.fillRequired'));
      return;
    }
    try {
      setSaving(true);
      await updateActorProfile(user.id, {
        media_saved_at: actorProfile?.media_saved_at ?? new Date().toISOString(),
      });
      await refreshProfile();
      Alert.alert(t('common.success'));
      router.replace('/');
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scroll
      header={<BackHeader fallbackHref="/(actor)" />}
      contentStyle={{ gap: Spacing.md, paddingTop: Spacing.md }}
    >
      <Text style={styles.title}>{reqLabel(t('media.section'))}</Text>
      <Text style={styles.hint}>{t('media.sectionHint')}</Text>

      <Text style={styles.subhead}>{t('media.cardPhotosTitle')}</Text>
      <Text style={styles.hint}>{t('media.cardPhotosHint')}</Text>
      {CARD_PHOTO_KINDS.map((kind) => {
        const photo = photoMap[kind];
        return (
          <View key={kind} style={[styles.card, styles.cardPhoto]}>
            <View style={styles.head}>
              <Text style={styles.cardTitle}>
                {reqLabel(`${t(`media.photos.${kind}`)} (${t('media.cardPhotoBadge')})`)}
              </Text>
              <Text style={photo ? styles.ok : styles.miss}>
                {photo ? t('media.uploaded') : t('media.missing')}
              </Text>
            </View>
            {photo ? <PhotoPreview uri={photo.public_url} /> : <PhotoExample kind={kind} />}
            <MediaSourceButtons
              loading={photoBusy === kind}
              onTake={() => takeNowPhoto(kind)}
              onLibrary={() => pickPhotoFromGallery(kind)}
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

      <Text style={styles.subhead}>{t('media.otherPhotosTitle')}</Text>
      {OTHER_PHOTO_KINDS.map((kind) => {
        const required = !OPTIONAL_PHOTO_SET.has(kind);
        const photo = photoMap[kind];
        return (
          <View key={kind} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.cardTitle}>
                {required ? reqLabel(t(`media.photos.${kind}`)) : t(`media.photos.${kind}`)}
              </Text>
              <Text style={photo ? styles.ok : styles.miss}>
                {photo ? t('media.uploaded') : t('media.missing')}
              </Text>
            </View>
            {photo ? <PhotoPreview uri={photo.public_url} /> : <PhotoExample kind={kind} />}
            <MediaSourceButtons
              loading={photoBusy === kind}
              onTake={() => takeNowPhoto(kind)}
              onLibrary={() => pickPhotoFromGallery(kind)}
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

      <Text style={styles.subhead}>{t('media.favoritePhotosTitle')}</Text>
      <Text style={styles.hint}>{t('media.favoritePhotosHint')}</Text>
      {FAVORITE_PHOTO_KINDS.map((kind) => {
        const photo = photoMap[kind];
        const onCard = kind === 'favorite_1';
        const title = onCard
          ? `${t(`media.photos.${kind}`)} (${t('media.favoriteOnCardBadge')})`
          : t(`media.photos.${kind}`);
        return (
          <View key={kind} style={[styles.card, onCard ? styles.cardPhoto : null]}>
            <View style={styles.head}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={photo ? styles.ok : styles.miss}>
                {photo ? t('media.uploaded') : t('common.optional')}
              </Text>
            </View>
            {photo ? <PhotoPreview uri={photo.public_url} /> : null}
            <MediaSourceButtons
              loading={photoBusy === kind}
              onTake={() => takeNowPhoto(kind)}
              onLibrary={() => pickPhotoFromGallery(kind)}
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

      {(
        [
          { kind: 'intro' as const, required: true, ready: !!actorProfile?.intro_video_playback_url },
          { kind: 'mimic' as const, required: true, ready: !!actorProfile?.mimic_video_playback_url },
          {
            kind: 'showreel' as const,
            required: false,
            ready: !!actorProfile?.showreel_playback_url,
          },
          {
            kind: 'talent' as const,
            required: false,
            ready: !!actorProfile?.talent_video_playback_url,
          },
        ] as const
      ).map((item) => (
        <View key={item.kind} style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.cardTitle}>
              {item.required
                ? reqLabel(t(`media.videos.${item.kind}`))
                : t(`media.videos.${item.kind}`)}
            </Text>
            <Text style={item.ready ? styles.ok : styles.miss}>
              {item.ready ? t('media.uploaded') : t('media.missing')}
            </Text>
          </View>
          <IntroVideoCard
            playbackUrl={actorProfile?.[PROFILE_VIDEO_KEYS[item.kind].url]}
            videoId={actorProfile?.[PROFILE_VIDEO_KEYS[item.kind].id]}
            title={t(`media.videos.${item.kind}`)}
            canManage
            changeLabel={t('media.takeNow')}
            emptyText={item.required ? t('media.missing') : t('profile.noVideo')}
            onChange={() =>
              router.push((item.kind === 'intro' ? '/record/intro' : `/record/${item.kind}`) as any)
            }
            onPickLibrary={() =>
              void pickProfileVideo(item.kind, t(`media.videos.${item.kind}`))
            }
            onDelete={async () => {
              if (!user) return;
              await clearProfileVideo(user.id, item.kind);
              await refreshProfile();
            }}
          />
          {item.kind === 'intro' ? (
            <View style={styles.langBox}>
              <Text style={styles.langTitle}>{t('media.videos.langIntro')}</Text>
              <Text style={styles.langHint}>{t('media.videos.langIntroHint')}</Text>
              {langVideos.map((video, index) => (
                <View key={video.id} style={styles.langRow}>
                  <Text style={styles.langSlot}>
                    {video.title || t('media.videos.langIntroSlot', { n: index + 1 })}
                  </Text>
                  <IntroVideoCard
                    playbackUrl={video.playback_url}
                    videoId={video.cf_uid ?? video.id}
                    title={video.title || t('media.videos.langIntroSlot', { n: index + 1 })}
                    canManage
                    changeLabel={t('media.takeNow')}
                    onChange={() =>
                      pickLangIntroThen(t, i18n.language, actorProfile?.languages, (lang) => {
                        router.push({
                          pathname: '/record/lang_intro',
                          params: { replaceId: video.id, ...(lang ? { lang } : {}) },
                        } as any);
                      })
                    }
                    onPickLibrary={() =>
                      pickLangIntroThen(t, i18n.language, actorProfile?.languages, (lang) => {
                        void pickProfileVideo(
                          LANG_INTRO_KIND,
                          lang
                            ? t('media.videos.langIntroNamed', {
                                language: lang,
                              })
                            : t('media.videos.langIntro'),
                          video.id
                        );
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
              ))}
              {langVideos.length < LANG_INTRO_MAX ? (
                <>
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
                  <Button
                    label={t('media.pickFromGallery')}
                    variant="secondary"
                    loading={videoBusy === LANG_INTRO_KIND}
                    onPress={() =>
                      pickLangIntroThen(t, i18n.language, actorProfile?.languages, (lang) => {
                        void pickProfileVideo(
                          LANG_INTRO_KIND,
                          lang
                            ? t('media.videos.langIntroNamed', {
                                language: lang,
                              })
                            : t('media.videos.langIntro')
                        );
                      })
                    }
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}

      <Button
        label={t('common.save')}
        onPress={() => void onSave()}
        loading={saving}
        style={{ marginTop: Spacing.sm, marginBottom: Spacing.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.text,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  subhead: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
  },
  cardPhoto: {
    borderWidth: 2,
    borderColor: CARD_PHOTO_BORDER,
    backgroundColor: '#F8FBFF',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.text,
  },
  ok: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.success },
  miss: { fontFamily: Fonts.bodyBold, fontSize: 12, color: Colors.danger },
  langBox: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  langTitle: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.text,
  },
  langHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  langRow: {
    gap: Spacing.xs,
  },
  langSlot: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.text,
  },
  thumb: {
    width: '100%',
    borderRadius: Radius.sm,
    backgroundColor: Colors.paperMuted,
  },
});
