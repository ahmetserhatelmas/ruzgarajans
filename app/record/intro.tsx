import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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

function IntroRecordContent() {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const onRecorded = async (uri: string) => {
    if (!user) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      await recordAndUploadVideo({
        localUri: uri,
        userId: user.id,
        kind: 'intro',
        title: 'Tanıtım',
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

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <View style={[styles.head, { paddingTop: Math.max(insets.top, 12) + Spacing.sm }]}>
        <Text style={styles.title} numberOfLines={1}>
          {t('home.introCta')}
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
        maxDuration={30}
        countdownEnabled
        hint={t('media.videos.introHint')}
      />
    </View>
  );
}

export default function IntroRecordScreen() {
  // fullScreenModal needs its own provider — parent insets can be 0
  return (
    <SafeAreaProvider>
      <IntroRecordContent />
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
    fontSize: 28,
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
