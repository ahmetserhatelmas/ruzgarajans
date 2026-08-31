import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { VideoLogoMark } from '@/components/video/VideoLogoMark';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  uri: string | null;
  title?: string;
  onClose: () => void;
};

function stopVideoPlayer(player: {
  pause: () => void;
  loop?: boolean;
  muted?: boolean;
  currentTime?: number;
}) {
  try {
    player.loop = false;
    player.pause();
    player.muted = true;
    player.currentTime = 0;
  } catch {
    // ignore
  }
}

function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    return () => stopVideoPlayer(player);
  }, [player]);

  return (
    <View style={styles.video}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
      />
      <VideoLogoMark />
    </View>
  );
}

export function VideoPlayerModal({ visible, uri, title, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.wrap, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={1}>
            {title || t('video.recording')}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
        {uri ? <Player key={uri} uri={uri} /> : <View style={styles.video} />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.ink },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.gold,
  },
  close: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.gold,
  },
  video: { flex: 1, backgroundColor: '#000' },
});
