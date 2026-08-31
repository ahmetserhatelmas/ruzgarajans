import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { VideoLogoMark } from '@/components/video/VideoLogoMark';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  alignTtsMarks,
  estimateActorHoldMs,
  lineAfterSec,
  parseDialogueScript,
  wordIndexAt,
  wordIndexAtProgress,
  wordIndexAtTime,
  wordsOf,
  type DialogueScript,
  type DialogueVoice,
  type DialogueWordMark,
} from '@/lib/dialogueScript';
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
  /** Allow picking a pre-recorded clip. Off for audition (Oyun Ver). */
  allowLibrary?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pickVoice(language: string, gender: DialogueVoice) {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const langPrefix = language.slice(0, 2).toLowerCase();
    const sameLang = voices.filter((voice) =>
      voice.language?.toLowerCase().startsWith(langPrefix)
    );
    const pool = sameLang;
    const female =
      /(female|woman|girl|yelda|ayda|emel|zira|filiz|yildiz|yıldız|kadın|kadin)/i;
    const male = /(male|man|boy|tolga|ahmet|emre|baris|barış|erkek)/i;
    const premium = /(enhanced|premium|neural|natural|compact|siri)/i;
    const ranked = pool
      .map((voice) => {
        const hay = `${voice.name} ${voice.identifier} ${voice.language}`.toLowerCase();
        let score = 0;
        if (voice.language?.toLowerCase() === language.toLowerCase()) score += 20;
        if (voice.quality === 'Enhanced') score += 14;
        if (premium.test(hay)) score += 8;
        const isFemale = female.test(hay);
        const isMale = male.test(hay);
        if (gender === 'female' && isFemale) score += 20;
        if (gender === 'male' && isMale) score += 20;
        if (gender === 'female' && isMale) score -= 16;
        if (gender === 'male' && isFemale) score -= 8;
        return { voice, score, matched: gender === 'female' ? isFemale : isMale };
      })
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    return { id: best?.voice.identifier, matched: Boolean(best?.matched) };
  } catch {
    return { id: undefined, matched: false };
  }
}

function DialogueWords({
  text,
  label,
  highlightIndex,
}: {
  text: string;
  label: string | null;
  highlightIndex: number;
}) {
  const words = wordsOf(text);
  return (
    <View style={styles.dialogueCard} pointerEvents="none">
      {label ? <Text style={styles.dialogueWho}>{label}</Text> : null}
      <Text style={styles.dialogueLine}>
        {words.map((word, index) => (
          <Text
            key={`${word}-${index}`}
            style={
              highlightIndex < 0 || index === highlightIndex
                ? styles.dialogueWordOn
                : styles.dialogueWord
            }
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </Text>
        ))}
      </Text>
    </View>
  );
}

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

function VideoPreview({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    return () => stopVideoPlayer(player);
  }, [player]);

  return (
    <View style={[styles.previewFill, { width, height }]}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: false }}
      />
      <VideoLogoMark />
    </View>
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
  allowLibrary = true,
}: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height && width > 100 && height > 100;
  const landscapeRef = useRef(isLandscape);
  landscapeRef.current = isLandscape;
  const [cameraBox, setCameraBox] = useState<{ w: number; h: number } | null>(null);
  const [camGen, setCamGen] = useState(0);
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
  const [showDialogue, setShowDialogue] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [cueLabel, setCueLabel] = useState<string | null>(null);
  const [cueText, setCueText] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [screenOn, setScreenOn] = useState(true);

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

  const hushAll = () => {
    cancelledRef.current = true;
    stopDialogueAssist();
    try {
      cameraRef.current?.stopRecording();
    } catch {
      // already stopped
    }
  };

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    return () => {
      hushAll();
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      cancelledRef.current = false;
      setScreenOn(true);
      return () => {
        setScreenOn(false);
        hushAll();
      };
    }, [])
  );

  useEffect(() => {
    if (countdown !== null || recording) return;
    if (!isLandscape) {
      setCameraBox(null);
      return;
    }
    const timer = setTimeout(() => setCameraBox({ w: width, h: height }), 80);
    return () => clearTimeout(timer);
  }, [isLandscape, width, height, countdown, recording]);

  const speakLines = async (lines: string[]) => {
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
    const voice = await pickVoice(lang, 'female');
    for (const line of lines) {
      if (cancelledRef.current) return;
      await speakText(line, {
        language: lang,
        voice: voice.id,
        rate: 0.65,
        pitch: 1,
      });
    }
  };

  const speakText = (
    text: string,
    opts: { language: string; voice?: string; rate: number; pitch: number }
  ) =>
    new Promise<void>((resolve) => {
      const words = wordsOf(text);
      let usedBoundary = false;
      const started = Date.now();
      const estimatedMs = Math.max(800, words.join(' ').length * (72 / Math.max(0.25, opts.rate)));
      const tick = setInterval(() => {
        if (usedBoundary || cancelledRef.current) return;
        const progress = (Date.now() - started) / estimatedMs;
        setHighlightIndex(wordIndexAtProgress(text, progress));
      }, 50);

      const finish = () => {
        clearInterval(tick);
        resolve();
      };

      Speech.speak(text, {
        language: opts.language,
        voice: opts.voice,
        rate: opts.rate,
        pitch: opts.pitch,
        ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false } : {}),
        onStart: () => setHighlightIndex(0),
        onBoundary: (ev: { charIndex?: number } | undefined) => {
          usedBoundary = true;
          const index = typeof ev?.charIndex === 'number' ? ev.charIndex : 0;
          setHighlightIndex(wordIndexAt(text, index));
        },
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    });

  const playRemoteAudio = (uri: string, text: string, marks?: DialogueWordMark[]) =>
    new Promise<void>((resolve) => {
      try {
        playerRef.current?.pause();
        playerRef.current?.release();
      } catch {
        // ignore
      }
      const player = createAudioPlayer({ uri });
      playerRef.current = player;
      const words = wordsOf(text);
      const aligned = alignTtsMarks(text, marks ?? []);
      player.play();
      const started = Date.now();
      const tick = setInterval(() => {
        let duration = Number(player.duration ?? 0);
        let current = Number(player.currentTime ?? 0);
        if (duration > 100) {
          duration /= 1000;
          current /= 1000;
        }
        if (aligned.length) {
          setHighlightIndex(wordIndexAtTime(aligned, current + 0.06));
        } else if (duration > 0) {
          const lookahead = Math.min(0.28, 0.12 + duration * 0.02);
          setHighlightIndex(wordIndexAtProgress(text, (current + lookahead) / duration));
        } else {
          const estimatedMs = Math.max(800, words.join(' ').length * 72);
          setHighlightIndex(wordIndexAtProgress(text, (Date.now() - started) / estimatedMs));
        }
        const finished =
          (duration > 0 && current >= duration - 0.08) ||
          (duration <= 0 && Date.now() - started > Math.max(4000, words.length * 420));
        if (cancelledRef.current || finished) {
          clearInterval(tick);
          resolve();
        }
      }, 40);
    });

  const playParsedScript = async (script: DialogueScript) => {
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
    const voice = await pickVoice(lang, script.voice);
    const rate = script.rate;
    const pitch = 1;

    await sleep(400);

    for (let i = 0; i < script.lines.length; i += 1) {
      const line = script.lines[i];
      if (cancelledRef.current) return;
      setCueLabel(
        line.speaker === 'actor' ? t('video.actorCue') : t('video.aiCue')
      );
      setCueText(line.text);
      setHighlightIndex(line.speaker === 'ai' ? 0 : -1);

      if (line.speaker === 'ai') {
        if (line.audioUrl) {
          await playRemoteAudio(line.audioUrl, line.text, line.words);
        } else {
          await speakText(line.text, { language: lang, voice: voice.id, rate, pitch });
        }
      } else {
        await sleep(estimateActorHoldMs(line.text));
      }
      if (cancelledRef.current) return;
      if (i < script.lines.length - 1) {
        await sleep(lineAfterSec(line.holdSec) * 1000);
      }
    }

    if (!cancelledRef.current) {
      setCueLabel(null);
      setCueText('');
      setHighlightIndex(-1);
    }
  };

  const previewScript = async () => {
    if (!dialogueScript || previewing || recording) return;
    cancelledRef.current = false;
    setPreviewing(true);
    setShowDialogue(true);
    try {
      await playParsedScript(parseDialogueScript(dialogueScript));
    } finally {
      setPreviewing(false);
      stopDialogueAssist();
    }
  };

  const startDialogueAssist = async () => {
    if (guidanceLines?.length) {
      setCueLabel(t('video.mimicGuidance'));
      setCueText(guidanceLines.join(' '));
      void speakLines(guidanceLines);
      return;
    }
    if (dialogueMode === 'script_tts' && dialogueScript) {
      void playParsedScript(parseDialogueScript(dialogueScript));
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

    if (!landscapeRef.current) {
      Alert.alert(t('video.landscapeRequired'), t('video.landscapeRequiredBody'));
      return;
    }

    if (recording || countdown !== null) return;

    setUri(null);
    cancelledRef.current = true;
    stopDialogueAssist();
    setPreviewing(false);
    cancelledRef.current = false;
    await runCountdown();
    if (cancelledRef.current) return;
    if (!cameraRef.current) {
      setCountdown(null);
      Alert.alert(t('common.error'), t('video.permission'));
      return;
    }
    if (!landscapeRef.current) {
      setCountdown(null);
      Alert.alert(t('video.landscapeRequired'), t('video.landscapeRequiredBody'));
      return;
    }

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
      setCueLabel(null);
      setCueText('');
      setHighlightIndex(-1);
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
        {allowLibrary ? (
          <Button
            label={t('video.pickVideo')}
            variant="secondary"
            onPress={() => void pickFromLibrary()}
          />
        ) : null}
      </View>
    );
  }

  const busy = recording || countdown !== null || previewing;

  if (!isLandscape && !uri && !isSimulator && countdown === null && !recording) {
    return (
      <View
        style={[
          styles.turnPhone,
          {
            paddingTop: Math.max(insets.top, 72),
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.lg,
          },
        ]}
      >
        <Ionicons name="phone-landscape-outline" size={64} color={Colors.gold} />
        <Text style={styles.landscapeTitle}>{t('video.landscapeRequired')}</Text>
        <Text style={styles.landscapeBody}>{t('video.landscapeRequiredBody')}</Text>
        {allowLibrary ? (
          <Button
            label={t('video.pickVideo')}
            variant="secondary"
            style={styles.recBtn}
            onPress={() => void pickFromLibrary()}
          />
        ) : null}
      </View>
    );
  }

  const overlayPad = {
    paddingLeft: Math.max(insets.left, Spacing.md),
    paddingRight: Math.max(insets.right, Spacing.md),
    paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
  };

  const camW = cameraBox?.w ?? width;
  const camH = cameraBox?.h ?? height;

  return (
    <View style={[styles.wrap, { width, height }]}>
      {uri && screenOn ? (
        <VideoPreview key={uri} uri={uri} width={width} height={height} />
      ) : uri ? (
        <View style={[styles.previewFill, { width, height, backgroundColor: '#000' }]} />
      ) : isSimulator ? (
        <View style={[styles.previewFill, styles.simPlaceholder]}>
          <Text style={styles.simTitle}>{t('video.simulatorTitle')}</Text>
          <Text style={styles.simBody}>{t('video.simulatorBody')}</Text>
        </View>
      ) : (
        <View style={[styles.cameraWrap, { width: camW, height: camH }]}>
          {cameraBox ? (
            <CameraView
              key={`cam-${camGen}-${facing}`}
              ref={cameraRef}
              style={{ width: cameraBox.w, height: cameraBox.h }}
              facing={facing}
              mode="video"
              mirror={facing === 'front'}
              onMountError={() => setCamGen((n) => (n < 2 ? n + 1 : n))}
            />
          ) : null}
          {!busy ? (
            <Pressable
              style={[styles.flipBtn, { top: 52, right: Math.max(insets.right, Spacing.md) }]}
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              hitSlop={12}
            >
              <Ionicons name="camera-reverse-outline" size={28} color={Colors.gold} />
              <Text style={styles.flipLabel}>{t('video.flipCamera')}</Text>
            </Pressable>
          ) : null}
          {dialogueMode === 'script_tts' || guidanceLines?.length ? (
            <Pressable
              style={[styles.dialogueToggle, { top: 52, left: Math.max(insets.left, Spacing.md) }]}
              onPress={() => setShowDialogue((v) => !v)}
              hitSlop={12}
            >
              <Ionicons
                name={showDialogue ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={Colors.textOnDark}
              />
              <Text style={styles.dialogueToggleLabel}>
                {showDialogue ? t('video.hideDialogue') : t('video.showDialogue')}
              </Text>
            </Pressable>
          ) : null}
          {showDialogue && cueText ? (
            <DialogueWords text={cueText} label={cueLabel} highlightIndex={highlightIndex} />
          ) : null}
          <VideoLogoMark />
        </View>
      )}
      {countdown !== null ? (
        <View style={[styles.countdownOverlay, { width, height }]} pointerEvents="none">
          <Text style={styles.countdownNum}>{countdown}</Text>
        </View>
      ) : (
        <View style={[styles.controls, overlayPad]} pointerEvents="box-none">
        {hint && !uri && !recording ? <Text style={styles.mode}>{hint}</Text> : null}
        {(dialogueMode !== 'none' || guidanceLines?.length) && !uri && !recording ? (
          <Text style={styles.mode}>
            {guidanceLines?.length
              ? t('video.mimicGuidance')
              : dialogueMode === 'script_tts'
                ? t('video.dialogueScript')
                : t('video.dialogueAudio')}
          </Text>
        ) : null}
        {!uri ? (
          <View style={styles.recActions} pointerEvents="box-none">
            {dialogueMode === 'script_tts' && dialogueScript && !isSimulator && !recording ? (
              <Button
                label={previewing ? t('video.stopPreview') : t('video.previewScript')}
                variant="secondary"
                style={styles.recBtn}
                onPress={() => {
                  if (previewing) {
                    cancelledRef.current = true;
                    stopDialogueAssist();
                    setPreviewing(false);
                    setCueLabel(null);
                    setCueText('');
                    return;
                  }
                  void previewScript();
                }}
                disabled={countdown !== null}
              />
            ) : null}
            {isSimulator ? (
              <Button
                label={t('video.pickVideo')}
                style={styles.recBtn}
                onPress={() => void pickFromLibrary()}
              />
            ) : (
              <Button
                label={
                  recording
                    ? t('video.stop')
                    : previewing
                      ? t('video.previewing')
                      : t('video.start')
                }
                onPress={recording ? stop : () => void start()}
                variant={recording ? 'danger' : 'primary'}
                disabled={!recording && !isLandscape}
                style={styles.recBtn}
              />
            )}
            {allowLibrary && !busy ? (
              <Button
                label={t('video.pickVideo')}
                variant="secondary"
                style={styles.recBtn}
                onPress={() => void pickFromLibrary()}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.recActions}>
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
              style={styles.recBtn}
            />
            <Button
              label={t('video.reRecord')}
              variant="secondary"
              onPress={() => setUri(null)}
              disabled={uploading}
              style={styles.recBtn}
            />
          </View>
        )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.ink, overflow: 'hidden' },
  turnPhone: {
    flex: 1,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  cameraWrap: { overflow: 'hidden', backgroundColor: Colors.ink },
  previewFill: { flex: 1 },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 50,
    elevation: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  landscapeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  landscapeTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.gold,
    textAlign: 'center',
  },
  landscapeBody: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textOnDark,
    textAlign: 'center',
    lineHeight: 22,
  },
  countdownNum: {
    fontFamily: Fonts.displayBold,
    fontSize: 120,
    color: Colors.gold,
  },
  flipBtn: {
    position: 'absolute',
    top: 52,
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
  dialogueToggle: {
    position: 'absolute',
    top: 52,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.md,
  },
  dialogueToggleLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.textOnDark,
  },
  dialogueCard: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 96,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(20,8,32,0.72)',
  },
  dialogueWho: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.gold,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  dialogueLine: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 20,
    lineHeight: 30,
    color: Colors.textOnDark,
  },
  dialogueWord: {
    color: 'rgba(255,255,255,0.55)',
  },
  dialogueWordOn: {
    color: '#FFFFFF',
    fontFamily: Fonts.bodyBold,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.sm,
    backgroundColor: 'transparent',
  },
  recActions: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recBtn: {
    minWidth: 168,
    alignSelf: 'center',
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
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
