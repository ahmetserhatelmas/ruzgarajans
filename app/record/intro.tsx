import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { VideoRecorder } from '@/components/video/VideoRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { offerLangIntroAfterLeave, pickLangIntroThen } from '@/lib/langIntro';
import { fetchLangIntroVideos, recordAndUploadVideo } from '@/services/videos';
import { Colors, Fonts, Spacing } from '@/constants/theme';

function IntroRecordContent() {
  const { t, i18n } = useTranslation();
  const { user, actorProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
      const count = (await fetchLangIntroVideos(user.id)).length;
      offerLangIntroAfterLeave({
        t,
        count,
        leave: () => router.back(),
        onRecord: () =>
          pickLangIntroThen(t, i18n.language, actorProfile?.languages, (lang) => {
            router.push({
              pathname: '/record/lang_intro',
              params: lang ? { lang } : {},
            } as any);
          }),
      });
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
        maxDuration={30}
        countdownEnabled
        hint={t('media.videos.introHint')}
      />
      <View
        style={[styles.head, { paddingTop: Math.max(insets.top, 8) }]}
        pointerEvents="box-none"
      >
        {isLandscape ? (
          <Text style={styles.title} numberOfLines={1}>
            {t('home.introCta')}
          </Text>
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
});
