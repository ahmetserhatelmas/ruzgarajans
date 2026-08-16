import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { uploadProfileImage } from '@/services/actors';
import {
  ALL_PHOTO_KINDS,
  fetchGalleryPhotos,
  photosByKind,
  upsertGalleryPhoto,
  type GalleryPhoto,
  type GalleryPhotoKind,
} from '@/services/gallery';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

function reqLabel(label: string) {
  return `${label} *`;
}

export default function MediaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, actorProfile, refreshProfile } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photoBusy, setPhotoBusy] = useState<GalleryPhotoKind | 'avatar' | 'cover' | null>(
    null
  );

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

  const pickProfilePhoto = async (role: 'avatar' | 'cover') => {
    if (!user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      setPhotoBusy(role);
      await uploadProfileImage({
        userId: user.id,
        localUri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType,
        role,
      });
      await refreshProfile();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setPhotoBusy(null);
    }
  };

  return (
    <Screen scroll contentStyle={{ gap: Spacing.md, paddingTop: Spacing.md }}>
      <BackHeader fallbackHref="/(actor)" />
      <Text style={styles.title}>{reqLabel(t('media.section'))}</Text>
      <Text style={styles.hint}>{t('media.sectionHint')}</Text>

      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.cardTitle}>{reqLabel(t('media.avatar'))}</Text>
          <Text style={profile?.avatar_url ? styles.ok : styles.miss}>
            {profile?.avatar_url ? t('media.uploaded') : t('media.missing')}
          </Text>
        </View>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.thumb} />
        ) : null}
        <Button
          label={profile?.avatar_url ? t('media.changePhoto') : t('media.uploadPhoto')}
          variant="secondary"
          loading={photoBusy === 'avatar'}
          onPress={() => void pickProfilePhoto('avatar')}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.cardTitle}>{t('media.cover')}</Text>
          <Text style={profile?.cover_url ? styles.ok : styles.miss}>
            {profile?.cover_url ? t('media.uploaded') : t('media.missing')}
          </Text>
        </View>
        {profile?.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={styles.thumb} />
        ) : null}
        <Button
          label={profile?.cover_url ? t('media.changePhoto') : t('media.uploadPhoto')}
          variant="secondary"
          loading={photoBusy === 'cover'}
          onPress={() => void pickProfilePhoto('cover')}
        />
      </View>

      {ALL_PHOTO_KINDS.map((kind) => {
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
            {photo ? <Image source={{ uri: photo.public_url }} style={styles.thumb} /> : null}
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
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
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
    height: 160,
    borderRadius: Radius.sm,
    backgroundColor: Colors.paperMuted,
  },
});
