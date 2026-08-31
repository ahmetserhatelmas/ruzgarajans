import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { VideoRecorder } from '@/components/video/VideoRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { languageLabel } from '@/constants/languages';
import { LANG_INTRO_KIND, offerLangIntroAfterLeave, pickLangIntroThen } from '@/lib/langIntro';
import { fetchLangIntroVideos, recordAndUploadVideo } from '@/services/videos';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import type { VideoKind } from '@/types/database';

const RECORDABLE: VideoKind[] = ['intro', 'mimic', 'showreel', 'talent', LANG_INTRO_KIND];

function RecordKindContent() {
  const { t, i18n } = useTranslation();
  const { kind: raw, replaceId: replaceRaw, lang: langRaw } = useLocalSearchParams<{
    kind: string;
    replaceId?: string;
    lang?: string;
  }>();
  const kind = (Array.isArray(raw) ? raw[0] : raw) as VideoKind;
  const replaceId = Array.isArray(replaceRaw) ? replaceRaw[0] : replaceRaw;
  const lang = Array.isArray(langRaw) ? langRaw[0] : langRaw;
  const { user, actorProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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
      case LANG_INTRO_KIND:
        return {
          title: lang
            ? t('media.videos.langIntroNamed', { language: languageLabel(lang, i18n.language) })
            : t('media.videos.langIntro'),
          maxDuration: 30,
          hint: t('media.videos.langIntroHint'),
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
  }, [kind, lang, t, i18n.language]);

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
        replaceVideoId: replaceId,
        onProgress: setUploadProgress,
      });
      setUploadProgress(100);
      await refreshProfile();
      if (kind === LANG_INTRO_KIND && !replaceId) {
        const count = (await fetchLangIntroVideos(user.id)).length;
        offerLangIntroAfterLeave({
          t,
          count,
          leave: () => router.back(),
          onRecord: () =>
            pickLangIntroThen(t, i18n.language, actorProfile?.languages, (nextLang) => {
              router.push({
                pathname: '/record/lang_intro',
                params: nextLang ? { lang: nextLang } : {},
              } as any);
            }),
        });
        return;
      }
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
      <StatusBar style="light" hidden />
      <VideoRecorder
        onRecorded={onRecorded}
        uploading={uploading}
        uploadProgress={uploadProgress}
        maxDuration={config.maxDuration}
        countdownEnabled
        guidanceLines={guidance}
        hint={config.hint}
      />
      <View
        style={[styles.head, { paddingTop: Math.max(insets.top, 8) }]}
        pointerEvents="box-none"
      >
        {isLandscape ? (
          <Text style={styles.title} numberOfLines={1}>
            {config.title}
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
});
