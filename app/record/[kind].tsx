import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { VideoRecorder } from '@/components/video/VideoRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { recordAndUploadVideo } from '@/services/videos';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import type { VideoKind } from '@/types/database';

const RECORDABLE: VideoKind[] = ['intro', 'mimic', 'showreel', 'talent'];

function RecordKindContent() {
  const { t } = useTranslation();
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const kind = (Array.isArray(raw) ? raw[0] : raw) as VideoKind;
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const config = useMemo(() => {
    switch (kind) {
      case 'intro':
        return {
          title: t('media.videos.intro'),
          maxDuration: 30,
          hint: t('media.videos.introHint'),
          guidanceLines: null as string[] | null,
        };
      case 'mimic':
        return {
          title: t('media.videos.mimic'),
          maxDuration: 15,
          hint: t('media.videos.mimicHint'),
          guidanceLines: t('media.mimicCueLines', { returnObjects: true }) as string[],
        };
      case 'showreel':
        return {
          title: t('media.videos.showreel'),
          maxDuration: 90,
          hint: t('media.videos.showreelHint'),
          guidanceLines: null as string[] | null,
        };
      case 'talent':
        return {
          title: t('media.videos.talent'),
          maxDuration: 120,
          hint: t('media.videos.talentHint'),
          guidanceLines: null as string[] | null,
        };
      default:
        return null;
    }
  }, [kind, t]);

  if (!RECORDABLE.includes(kind) || !config) {
    return <Redirect href="/" />;
  }

  const onRecorded = async (uri: string) => {
    if (!user) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      await recordAndUploadVideo({
        localUri: uri,
        userId: user.id,
        kind,
        title: config.title,
        onProgress: setUploadProgress,
      });
      setUploadProgress(100);
      await refreshProfile();
      Alert.alert(t('common.success'));
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const guidance =
    Array.isArray(config.guidanceLines) && config.guidanceLines.length > 0
      ? config.guidanceLines
      : null;

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <View style={[styles.head, { paddingTop: Math.max(insets.top, 12) + Spacing.sm }]}>
        <Text style={styles.title} numberOfLines={1}>
          {config.title}
        </Text>
        <Pressable
          hitSlop={16}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
      {uploading ? (
        <Text style={styles.uploading}>
          {t('video.uploadingPercent', {
            percent: Math.max(0, Math.min(100, uploadProgress ?? 0)),
          })}
        </Text>
      ) : null}
      <VideoRecorder
        onRecorded={onRecorded}
        uploading={uploading}
        uploadProgress={uploadProgress}
        maxDuration={config.maxDuration}
        countdownEnabled
        guidanceLines={guidance}
        hint={config.hint}
      />
    </View>
  );
}

export default function RecordKindScreen() {
  return (
    <SafeAreaProvider>
      <RecordKindContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.ink },
  head: {
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.displayBold,
    fontSize: 24,
    color: Colors.gold,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.gold,
  },
  uploading: {
    color: Colors.textOnDark,
    fontFamily: Fonts.body,
    textAlign: 'center',
    padding: Spacing.sm,
  },
});
