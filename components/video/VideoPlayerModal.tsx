import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { createVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { setAudioModeAsync } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isTabletDevice, lockInterfaceOrientation } from '@/lib/appOrientation';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = {
  visible: boolean;
  uri: string | null;
  title?: string;
  onClose: () => void;
};

const releasedPlayers = new WeakSet<VideoPlayer>();

function killPlayer(player: VideoPlayer | null) {
  if (!player || releasedPlayers.has(player)) return;
  releasedPlayers.add(player);
  try {
    player.loop = false;
    player.muted = true;
    player.volume = 0;
    player.pause();
  } catch {
    // already released
  }
  try {
    player.release();
  } catch {
    // ignore
  }
}

function replaceSource(player: VideoPlayer, uri: string) {
  return player.replaceAsync(uri).catch(() => {
    // Android rejects this if the native player was already released.
  });
}

async function hushAudioSession() {
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      interruptionMode: 'doNotMix',
    });
  } catch {
    // ignore
  }
}

function playUri(uri: string, attempt: number) {
  if (attempt <= 0) return uri;
  const join = uri.includes('?') ? '&' : '?';
  return `${uri}${join}r=${Date.now()}`;
}

export function VideoPlayerModal({ visible, uri, title, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const playerRef = useRef<VideoPlayer | null>(null);
  const [player, setPlayer] = useState<VideoPlayer | null>(null);
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [ended, setEnded] = useState(false);
  const slidingRef = useRef(false);
  const retryRef = useRef(0);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!visible || isTabletDevice()) return;
    void lockInterfaceOrientation();
  }, [visible]);

  useEffect(() => {
    if (!visible || !uri) {
      retryRef.current = 0;
      const old = playerRef.current;
      playerRef.current = null;
      setPlayer(null);
      setPosition(0);
      setDuration(0);
      setPreparing(false);
      setStuck(false);
      setEnded(false);
      void hushAudioSession();
      const detach = setTimeout(() => killPlayer(old), 120);
      return () => {
        clearTimeout(detach);
        killPlayer(old);
      };
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    let detachTimer: ReturnType<typeof setTimeout> | null = null;
    const listeners: { remove: () => void }[] = [];

    const clearTimers = () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (watchdog) clearTimeout(watchdog);
      if (detachTimer) clearTimeout(detachTimer);
      retryTimer = null;
      watchdog = null;
      detachTimer = null;
    };

    const bindPlayer = (next: VideoPlayer) => {
      for (const sub of listeners) {
        try {
          sub.remove();
        } catch {
          // ignore
        }
      }
      listeners.length = 0;

      next.loop = false;
      next.muted = false;
      next.volume = 1;
      next.staysActiveInBackground = false;
      next.timeUpdateEventInterval = 0.25;
      playerRef.current = next;
      setPlayer(next);
      setPaused(true);
      setPosition(0);
      setDuration(0);
      setPreparing(true);
      setStuck(false);
      setEnded(false);

      const markReady = () => {
        if (cancelled || playerRef.current !== next) return;
        setPreparing(false);
        setStuck(false);
        try {
          next.muted = false;
          next.volume = 1;
          next.play();
          setPaused(false);
        } catch {
          // ignore
        }
      };

      const scheduleRetry = () => {
        if (cancelled) return;
        if (retryRef.current >= 18) {
          setPreparing(false);
          setStuck(true);
          return;
        }
        retryRef.current += 1;
        setPreparing(true);
        retryTimer = setTimeout(() => boot(retryRef.current), 2500);
      };

      listeners.push(
        next.addListener('statusChange', ({ status }) => {
          if (cancelled || playerRef.current !== next) return;
          if (status === 'readyToPlay') {
            const len = next.duration;
            if (Number.isFinite(len) && len > 0) {
              setDuration(len);
              markReady();
            }
            return;
          }
          if (status === 'error') scheduleRetry();
        })
      );
      listeners.push(
        next.addListener('timeUpdate', (event) => {
          if (slidingRef.current || playerRef.current !== next) return;
          setPosition(event.currentTime);
          const len = next.duration;
          if (Number.isFinite(len) && len > 0) {
            setDuration(len);
            setPreparing(false);
          }
        })
      );
      listeners.push(
        next.addListener('playToEnd', () => {
          if (playerRef.current !== next) return;
          const len = next.duration;
          if (Number.isFinite(len) && len > 0) setPosition(len);
          setEnded(true);
          setPaused(true);
        })
      );

      watchdog = setTimeout(() => {
        if (cancelled || playerRef.current !== next) return;
        const len = next.duration;
        if (next.status === 'readyToPlay' || (Number.isFinite(len) && len > 0)) {
          markReady();
          return;
        }
        scheduleRetry();
      }, 3500);
    };

    const boot = (attempt: number) => {
      if (cancelled) return;
      clearTimers();
      const source = playUri(uri, attempt);
      const current = playerRef.current;
      if (current && !releasedPlayers.has(current)) {
        void replaceSource(current, source);
        setPreparing(true);
        setStuck(false);
        watchdog = setTimeout(() => {
          if (cancelled || playerRef.current !== current) return;
          const len = current.duration;
          if (current.status === 'readyToPlay' || (Number.isFinite(len) && len > 0)) {
            try {
              current.play();
              setPaused(false);
              setPreparing(false);
            } catch {
              // ignore
            }
            return;
          }
          if (retryRef.current >= 18) {
            setPreparing(false);
            setStuck(true);
            return;
          }
          retryRef.current += 1;
          retryTimer = setTimeout(() => boot(retryRef.current), 2500);
        }, 3500);
        return;
      }

      const old = current;
      playerRef.current = null;
      setPlayer(null);
      detachTimer = setTimeout(() => {
        killPlayer(old);
        if (cancelled) return;
        try {
          bindPlayer(createVideoPlayer(source));
        } catch {
          if (retryRef.current >= 18) {
            setPreparing(false);
            setStuck(true);
            return;
          }
          retryRef.current += 1;
          retryTimer = setTimeout(() => boot(retryRef.current), 2500);
        }
      }, 80);
    };

    retryRef.current = 0;
    boot(0);

    return () => {
      cancelled = true;
      clearTimers();
      for (const sub of listeners) {
        try {
          sub.remove();
        } catch {
          // ignore
        }
      }
      const old = playerRef.current;
      playerRef.current = null;
      setTimeout(() => killPlayer(old), 120);
    };
  }, [visible, uri, reloadToken]);

  const close = () => {
    const old = playerRef.current;
    playerRef.current = null;
    setPlayer(null);
    setTimeout(() => killPlayer(old), 120);
    void hushAudioSession();
    onClose();
  };

  const toggle = () => {
    const current = playerRef.current;
    if (!current) return;
    try {
      if (paused) {
        const len = duration > 0 ? duration : current.duration;
        const pos = position > 0 ? position : current.currentTime;
        const atEnd =
          ended ||
          (Number.isFinite(len) && Number.isFinite(pos) && len > 0 && pos >= len - 0.4);
        current.muted = false;
        current.volume = 1;
        if (atEnd) {
          try {
            current.replay();
          } catch {
            current.currentTime = 0;
          }
          setPosition(0);
          setEnded(false);
        }
        current.play();
        setPaused(false);
      } else {
        current.pause();
        setPaused(true);
      }
    } catch {
      // ignore
    }
  };

  const seekTo = (sec: number) => {
    const current = playerRef.current;
    if (!current) return;
    const max = duration > 0 ? duration : current.duration;
    const next = Math.max(0, Math.min(Number.isFinite(max) && max > 0 ? max : sec, sec));
    try {
      current.currentTime = next;
      setPosition(next);
      setEnded(false);
    } catch {
      // ignore
    }
  };

  const skip = (delta: number) => {
    seekTo(position + delta);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <View
        style={[
          styles.wrap,
          { paddingTop: insets.top + Spacing.sm, paddingBottom: Math.max(insets.bottom, Spacing.md) },
        ]}
      >
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={1}>
            {title || t('video.recording')}
          </Text>
          <Pressable onPress={close} hitSlop={16}>
            <Text style={styles.close}>{t('common.done')}</Text>
          </Pressable>
        </View>
        <View style={styles.video}>
          {player && !releasedPlayers.has(player) ? (
            <VideoView
              style={StyleSheet.absoluteFill}
              player={player}
              nativeControls={false}
              contentFit="contain"
              fullscreenOptions={{ enable: false }}
              showsTimecodes={false}
            />
          ) : (
            <View style={StyleSheet.absoluteFill} />
          )}
          {preparing || stuck ? (
            <View style={styles.prepareOverlay}>
              {preparing ? <ActivityIndicator color={Colors.gold} size="large" /> : null}
              <Text style={styles.prepareTitle}>
                {stuck ? t('video.prepareFailed') : t('video.preparing')}
              </Text>
              {preparing ? <Text style={styles.prepareHint}>{t('video.preparingHint')}</Text> : null}
              {stuck ? (
                <Pressable
                  onPress={() => {
                    retryRef.current = 0;
                    setStuck(false);
                    setPreparing(true);
                    setReloadToken((n) => n + 1);
                  }}
                  style={styles.retryBtn}
                >
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.controls}>
          <View style={styles.buttons}>
            <Pressable onPress={() => skip(-10)} style={styles.skipBtn} hitSlop={10}>
              <Ionicons name="play-back" size={26} color={Colors.textOnDark} />
              <Text style={styles.skipLabel}>10</Text>
            </Pressable>
            <Pressable onPress={toggle} style={styles.playBtn} hitSlop={12}>
              <Ionicons name={paused ? 'play' : 'pause'} size={28} color={Colors.textOnDark} />
            </Pressable>
            <Pressable onPress={() => skip(10)} style={styles.skipBtn} hitSlop={10}>
              <Ionicons name="play-forward" size={26} color={Colors.textOnDark} />
              <Text style={styles.skipLabel}>10</Text>
            </Pressable>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration > 0 ? duration : Math.max(position, 1)}
            value={position}
            onSlidingStart={() => {
              slidingRef.current = true;
            }}
            onValueChange={(value) => {
              if (slidingRef.current) setPosition(value);
            }}
            onSlidingComplete={(value) => {
              slidingRef.current = false;
              seekTo(value);
            }}
            minimumTrackTintColor={Colors.gold}
            maximumTrackTintColor="rgba(255,255,255,0.28)"
            thumbTintColor={Colors.gold}
          />
          <Text style={styles.time}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
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
  video: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: Radius.md,
  },
  prepareOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.72)',
    gap: Spacing.sm,
  },
  prepareTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.textOnDark,
    textAlign: 'center',
  },
  prepareHint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textOnDark,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand,
  },
  retryText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.textOnDark,
  },
  controls: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  skipLabel: {
    marginTop: -4,
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.textOnDark,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  time: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.textOnDark,
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: Spacing.xs,
  },
});
