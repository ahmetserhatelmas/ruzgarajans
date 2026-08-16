import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraType,
} from 'expo-camera';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import type { DialogueMode } from '@/types/database';

type Props = {
  onRecorded: (uri: string) => void;
  uploading?: boolean;
  /** 0–100 while uploading */
  uploadProgress?: number | null;
  dialogueMode?: DialogueMode;
  dialogueScript?: string | null;
  dialogueAudioUrl?: string | null;
  /** Max recording length in seconds */
  maxDuration?: number;
  /** Show 3-2-1 overlay before recording starts (default true) */
  countdownEnabled?: boolean;
  /** Spoken guidance lines while recording (e.g. mimic cues) */
  guidanceLines?: string[] | null;
  hint?: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  return (
    <VideoView
      style={styles.camera}
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
    />
  );
}

export function VideoRecorder({
  onRecorded,
  uploading,
  uploadProgress = null,
  dialogueMode = 'none',
  dialogueScript,
  dialogueAudioUrl,
  maxDuration = 180,
  countdownEnabled = true,
  guidanceLines,
  hint,
}: Props) {
  const { t, i18n } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const playerRef = useRef<AudioPlayer | null>(null);
  const cancelledRef = useRef(false);
  const isSimulator = !Device.isDevice;

  const stopDialogueAssist = () => {
    Speech.stop();
    try {
      playerRef.current?.pause();
      playerRef.current?.release();
    } catch {
      // ignore cleanup errors
    }
    playerRef.current = null;
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopDialogueAssist();
    };
  }, []);

  const speakLines = async (lines: string[]) => {
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
    for (const line of lines) {
      if (cancelledRef.current) return;
      await new Promise<void>((resolve) => {
        Speech.speak(line, {
          language: lang,
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: () => resolve(),
        });
      });
    }
  };

  const startDialogueAssist = async () => {
    if (guidanceLines?.length) {
      void speakLines(guidanceLines);
      return;
    }
    if (dialogueMode === 'script_tts' && dialogueScript) {
      const lines = dialogueScript
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      void speakLines(lines);
    }
    if (dialogueMode === 'audio_file' && dialogueAudioUrl) {
      const player = createAudioPlayer({ uri: dialogueAudioUrl });
      playerRef.current = player;
      player.play();
    }
  };

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
        videoMaxDuration: maxDuration,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    }
  };

  const runCountdown = async () => {
    if (!countdownEnabled) return;
    for (const n of [3, 2, 1]) {
      if (cancelledRef.current) return;
      setCountdown(n);
      await sleep(1000);
    }
    setCountdown(null);
  };

  const start = async () => {
    if (isSimulator) {
      Alert.alert(t('video.simulatorTitle'), t('video.simulatorBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('video.pickVideo'), onPress: () => void pickFromLibrary() },
      ]);
      return;
    }

    if (!cameraRef.current || recording || countdown !== null) return;

    setUri(null);
    cancelledRef.current = false;
    await runCountdown();
    if (cancelledRef.current || !cameraRef.current) return;

    setRecording(true);
    void startDialogueAssist();

    try {
      const result = await cameraRef.current.recordAsync({ maxDuration });
      if (result?.uri) setUri(result.uri);
    } catch (e: any) {
      const message = String(e?.message ?? e ?? '');
      if (message.includes('SimulatorNotSupported') || message.includes('simulator')) {
        Alert.alert(t('video.simulatorTitle'), t('video.simulatorBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('video.pickVideo'), onPress: () => void pickFromLibrary() },
        ]);
      } else {
        Alert.alert(t('common.error'), message || t('common.error'));
      }
    } finally {
      setRecording(false);
      stopDialogueAssist();
    }
  };

  const stop = () => {
    try {
      cameraRef.current?.stopRecording();
    } catch {
      setRecording(false);
      stopDialogueAssist();
    }
  };

  if (!camPerm?.granted || !micPerm?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t('video.permission')}</Text>
        <Button
          label={t('common.continue')}
          onPress={async () => {
            await requestCam();
            await requestMic();
          }}
        />
        <Button
          label={t('video.pickVideo')}
          variant="secondary"
          onPress={() => void pickFromLibrary()}
        />
      </View>
    );
  }

  const busy = recording || countdown !== null;

  return (
    <View style={styles.wrap}>
      {uri ? (
        <VideoPreview key={uri} uri={uri} />
      ) : isSimulator ? (
        <View style={[styles.camera, styles.simPlaceholder]}>
          <Text style={styles.simTitle}>{t('video.simulatorTitle')}</Text>
          <Text style={styles.simBody}>{t('video.simulatorBody')}</Text>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            mode="video"
            mirror={facing === 'front'}
          />
          {countdown !== null ? (
            <View style={styles.countdownOverlay} pointerEvents="none">
              <Text style={styles.countdownNum}>{countdown}</Text>
            </View>
          ) : null}
          {!busy ? (
            <Pressable
              style={styles.flipBtn}
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              hitSlop={12}
            >
              <Ionicons name="camera-reverse-outline" size={28} color={Colors.gold} />
              <Text style={styles.flipLabel}>{t('video.flipCamera')}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <View style={styles.controls}>
        {hint && !uri ? <Text style={styles.mode}>{hint}</Text> : null}
        {(dialogueMode !== 'none' || guidanceLines?.length) && !uri ? (
          <Text style={styles.mode}>
            {guidanceLines?.length
              ? t('video.mimicGuidance')
              : dialogueMode === 'script_tts'
                ? t('video.dialogueScript')
                : t('video.dialogueAudio')}
          </Text>
        ) : null}
        {!uri ? (
          <>
            {isSimulator ? (
              <Button label={t('video.pickVideo')} onPress={() => void pickFromLibrary()} />
            ) : (
              <Button
                label={
                  countdown !== null
                    ? String(countdown)
                    : recording
                      ? t('video.stop')
                      : t('video.start')
                }
                onPress={recording ? stop : () => void start()}
                variant={recording ? 'danger' : 'primary'}
                disabled={countdown !== null}
              />
            )}
            {!busy ? (
              <Button
                label={t('video.pickVideo')}
                variant="secondary"
                onPress={() => void pickFromLibrary()}
              />
            ) : null}
          </>
        ) : (
          <>
            {!uploading ? (
              <Text style={styles.previewHint}>{t('video.previewHint')}</Text>
            ) : (
              <View style={styles.progressWrap}>
                <Text style={styles.progressText}>
                  {t('video.uploadingPercent', {
                    percent: Math.max(0, Math.min(100, uploadProgress ?? 0)),
                  })}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(0, Math.min(100, uploadProgress ?? 0))}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
            <Button
              label={
                uploading
                  ? t('video.uploadingPercent', {
                      percent: Math.max(0, Math.min(100, uploadProgress ?? 0)),
                    })
                  : t('video.upload')
              }
              onPress={() => onRecorded(uri)}
              loading={uploading}
              disabled={uploading}
            />
            <Button
              label={t('video.reRecord')}
              variant="secondary"
              onPress={() => setUri(null)}
              disabled={uploading}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.ink },
  cameraWrap: { flex: 1 },
  camera: { flex: 1 },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  countdownNum: {
    fontFamily: Fonts.displayBold,
    fontSize: 120,
    color: Colors.gold,
  },
  flipBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
    gap: 4,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
  },
  flipLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.gold,
  },
  simPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  simTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.gold,
    textAlign: 'center',
  },
  simBody: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textOnDark,
    textAlign: 'center',
    lineHeight: 22,
  },
  controls: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.ink,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.paper,
  },
  text: {
    fontFamily: Fonts.body,
    color: Colors.text,
    textAlign: 'center',
  },
  mode: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.gold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  previewHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textOnDark,
    textAlign: 'center',
    opacity: 0.8,
  },
  progressWrap: { gap: Spacing.sm, marginBottom: Spacing.xs },
  progressText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.gold,
    textAlign: 'center',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 999,
  },
});
