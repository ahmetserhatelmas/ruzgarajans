import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { VideoRecorder } from '@/components/video/VideoRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCastById } from '@/services/casts';
import { recordAndUploadVideo } from '@/services/videos';
import type { CastListing } from '@/types/database';
import { Colors, Fonts, Spacing } from '@/constants/theme';

function AuditionRecordContent() {
  const { castId, applicationId } = useLocalSearchParams<{
    castId: string;
    applicationId?: string;
  }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [cast, setCast] = useState<CastListing | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!castId) return;
    fetchCastById(castId)
      .then((next) => {
        if (next && next.requires_video === false) {
          Alert.alert(t('cast.noVideoNeeded'), t('cast.noVideoNeededBody'));
          router.back();
          return;
        }
        setCast(next);
      })
      .catch(() => undefined);
  }, [castId, router, t]);

  const onRecorded = async (uri: string) => {
    if (!user || !castId) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      await recordAndUploadVideo({
        localUri: uri,
        userId: user.id,
        kind: 'audition',
        castId,
        applicationId: applicationId ?? null,
        title: cast?.project_name ?? 'Audition',
        onProgress: setUploadProgress,
      });
      setUploadProgress(100);
      Alert.alert(t('common.success'));
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="light" hidden />
      <VideoRecorder
        onRecorded={onRecorded}
        uploading={uploading}
        uploadProgress={uploadProgress}
        dialogueMode={cast?.dialogue_mode ?? 'none'}
        dialogueScript={cast?.dialogue_script}
        dialogueAudioUrl={cast?.dialogue_audio_url}
        countdownEnabled
        allowLibrary={false}
      />
      <View
        style={[styles.head, { paddingTop: Math.max(insets.top, 8) }]}
        pointerEvents="box-none"
      >
        {isLandscape ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('cast.audition')}</Text>
            <Text style={styles.sub}>{cast?.project_name}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          hitSlop={16}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AuditionRecordScreen() {
  // fullScreenModal needs its own provider — parent insets can be 0
  return (
    <SafeAreaProvider>
      <AuditionRecordContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.ink },
  head: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.gold,
  },
  sub: {
    fontFamily: Fonts.body,
    color: Colors.textOnDark,
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
});
