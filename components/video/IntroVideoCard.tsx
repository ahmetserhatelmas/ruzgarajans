import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { VideoPlayerModal } from '@/components/video/VideoPlayerModal';
import { streamThumbnailUrl } from '@/lib/cloudflare';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  playbackUrl?: string | null;
  videoId?: string | null;
  title?: string;
  /** Actor can change / delete */
  canManage?: boolean;
  onChange?: () => void;
  onDelete?: () => Promise<void> | void;
};

export function IntroVideoCard({
  playbackUrl,
  videoId,
  title,
  canManage,
  onChange,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const thumb =
    videoId != null && videoId.length > 0
      ? streamThumbnailUrl(videoId)
      : null;

  if (!playbackUrl) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('profile.noIntroVideo')}</Text>
        {canManage && onChange ? (
          <Button label={t('home.introCta')} onPress={onChange} />
        ) : null}
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert(t('profile.deleteIntroTitle'), t('profile.deleteIntroBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!onDelete) return;
          try {
            setDeleting(true);
            await onDelete();
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message ?? t('common.error'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.thumbWrap} onPress={() => setOpen(true)}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={64} color={Colors.gold} />
          <Text style={styles.playLabel}>{t('admin.watchVideo')}</Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Button
          label={t('admin.watchVideo')}
          variant="secondary"
          onPress={() => setOpen(true)}
          style={canManage ? styles.actionBtn : undefined}
        />
        {canManage ? (
          <>
            <Button
              label={t('profile.changeIntro')}
              onPress={onChange}
              style={styles.actionBtn}
            />
            <Button
              label={t('common.delete')}
              variant="danger"
              loading={deleting}
              onPress={confirmDelete}
              style={styles.actionBtn}
            />
          </>
        ) : null}
      </View>

      <VideoPlayerModal
        visible={open}
        uri={playbackUrl}
        title={title ?? t('profile.introVideo')}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  empty: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  thumbWrap: {
    height: 220,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumb: { width: '100%', height: '100%' },
  thumbFallback: { backgroundColor: Colors.inkSoft },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    gap: 4,
  },
  playLabel: {
    fontFamily: Fonts.bodyBold,
    color: Colors.textOnDark,
    fontSize: 14,
  },
  actions: { gap: Spacing.sm },
  actionBtn: { alignSelf: 'stretch' },
});
