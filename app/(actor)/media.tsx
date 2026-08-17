import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  ALL_PHOTO_KINDS,
  fetchGalleryPhotos,
  photosByKind,
  upsertGalleryPhoto,
  type GalleryPhoto,
  type GalleryPhotoKind,
} from '@/services/gallery';
import { updateActorProfile } from '@/services/actors';
import { hasRequiredGalleryMedia } from '@/lib/access';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const CARD_PHOTO_KINDS: GalleryPhotoKind[] = [
  'full_body',
  'profile_left',
  'profile_right',
  'chest',
];
const CARD_PHOTO_SET = new Set<GalleryPhotoKind>(CARD_PHOTO_KINDS);
const OTHER_PHOTO_KINDS = ALL_PHOTO_KINDS.filter((kind) => !CARD_PHOTO_SET.has(kind));
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
  const { t } = useTranslation();
  const router = useRouter();
  const { user, actorProfile, refreshProfile } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photoBusy, setPhotoBusy] = useState<GalleryPhotoKind | null>(null);
  const [saving, setSaving] = useState(false);

  const photoMap = useMemo(() => photosByKind(photos), [photos]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshProfile();
      void fetchGalleryPhotos(user.id)
        .then(setPhotos)
        .catch(() => undefined);
    }, [user, refreshProfile])
  );

  const pickPhoto = async (kind: GalleryPhotoKind) => {
    if (!user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;
      setPhotoBusy(kind);
      const saved = await upsertGalleryPhoto({
        userId: user.id,
        kind,
        localUri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType,
      });
      setPhotos((prev) => {
        const rest = prev.filter((p) => p.kind !== kind);
        return [...rest, saved];
      });
      await refreshProfile();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setPhotoBusy(null);
    }
  };

  const onSave = async () => {
    if (!user) return;
    if (!hasRequiredGalleryMedia(actorProfile, photos)) {
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
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentStyle={{ gap: Spacing.md, paddingTop: Spacing.md }}>
      <BackHeader fallbackHref="/(actor)" />
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
            {photo ? <PhotoPreview uri={photo.public_url} /> : null}
            <Button
              label={photo ? t('media.changePhoto') : t('media.uploadPhoto')}
              variant="secondary"
              loading={photoBusy === kind}
              onPress={() => void pickPhoto(kind)}
            />
          </View>
        );
      })}

      <Text style={styles.subhead}>{t('media.otherPhotosTitle')}</Text>
      {OTHER_PHOTO_KINDS.map((kind) => {
        const required = !['model_pose', 'hands'].includes(kind);
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
            {photo ? <PhotoPreview uri={photo.public_url} /> : null}
            <Button
              label={photo ? t('media.changePhoto') : t('media.uploadPhoto')}
              variant="secondary"
              loading={photoBusy === kind}
              onPress={() => void pickPhoto(kind)}
            />
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
          <Button
            label={item.ready ? t('media.changePhoto') : t('media.record')}
            variant={item.required && !item.ready ? 'primary' : 'secondary'}
            onPress={() =>
              router.push((item.kind === 'intro' ? '/record/intro' : `/record/${item.kind}`) as any)
            }
          />
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
  thumb: {
    width: '100%',
    borderRadius: Radius.sm,
    backgroundColor: Colors.paperMuted,
  },
});
