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
  type ViewStyle,
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
import { localizedError } from '@/lib/authErrors';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
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

const AUDIO_PLAYER_OPTS = {
  downloadFirst: true,
  keepAudioSessionActive: true,
  updateInterval: 50,
};

function audioSeconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 100 ? value / 1000 : value;
}

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
  /** expo-speech rate; 1.0 is normal, lower is slower */
  guidanceRate?: number;
  /** Pause after each spoken cue, in milliseconds */
  guidancePauseMs?: number;
  hint?: string | null;
  /** Allow picking a pre-recorded clip from the gallery. */
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

/** Dynamic Island sits on a short edge in landscape; insets often stay at portrait values after lock. */
function landscapeEdgeInset(insets: { top: number; left: number; right: number }) {
  const reported = Math.max(insets.left, insets.right, insets.top);
  const island = Platform.OS === 'ios' ? 88 : Spacing.md;
  return Math.max(reported + 16, island);
}

function DialogueWords({
  text,
  label,
  highlightIndex,
  holdLeftMs,
  holdTotalMs,
  holdCaption,
  style,
}: {
  text: string;
  label: string | null;
  highlightIndex: number;
  holdLeftMs?: number;
  holdTotalMs?: number;
  holdCaption?: string | null;
  style?: ViewStyle;
}) {
  const words = wordsOf(text);
  const total = holdTotalMs && holdTotalMs > 0 ? holdTotalMs : 0;
  const left = total ? Math.max(0, Math.min(total, holdLeftMs ?? 0)) : 0;
  const pct = total ? (left / total) * 100 : 0;
  return (
    <View style={[styles.dialogueCard, style]} pointerEvents="none">
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
      {total > 0 ? (
        <View style={styles.holdWrap}>
          <View style={styles.holdTrack}>
            <View style={[styles.holdFill, { width: `${pct}%` }]} />
          </View>
          {holdCaption ? <Text style={styles.holdCaption}>{holdCaption}</Text> : null}
        </View>
      ) : null}
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
  guidanceRate = 1,
  guidancePauseMs = 1500,
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
  const mountedRef = useRef(true);
  const recordingRef = useRef(false);
  const holdCameraRef = useRef(false);
  const assistTimersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const isSimulator = !Device.isDevice;
  const [showDialogue, setShowDialogue] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [cueLabel, setCueLabel] = useState<string | null>(null);
  const [cueText, setCueText] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [cueHold, setCueHold] = useState<{ totalMs: number; leftMs: number } | null>(null);
  const [screenOn, setScreenOn] = useState(true);

  const clearAssistTimers = () => {
    for (const id of assistTimersRef.current) clearInterval(id);
    assistTimersRef.current = [];
  };

  const trackTimer = (id: ReturnType<typeof setInterval>) => {
    assistTimersRef.current.push(id);
    return id;
  };

  const releasePlayerSoon = (player: AudioPlayer | null) => {
    if (!player) return;
    try {
      player.pause();
    } catch {
      // ignore
    }
    setTimeout(() => {
      try {
        player.release();
      } catch {
        // ignore
      }
    }, 180);
  };

  const stopDialogueAssist = () => {
    clearAssistTimers();
    setCueHold(null);
    try {
      Speech.stop();
    } catch {
      // ignore
    }
    const player = playerRef.current;
    playerRef.current = null;
    releasePlayerSoon(player);
  };

  const hushAll = () => {
    cancelledRef.current = true;
    stopDialogueAssist();
    if (recordingRef.current) {
      try {
        cameraRef.current?.stopRecording();
      } catch {
        // already stopped
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    return () => {
      mountedRef.current = false;
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
    if (countdown !== null || recording || holdCameraRef.current) return;
    if (!isLandscape) {
      setCameraBox(null);
      return;
    }
    const timer = setTimeout(() => {
      if (holdCameraRef.current || recordingRef.current) return;
      setCameraBox({ w: width, h: height });
    }, 80);
    return () => clearTimeout(timer);
  }, [isLandscape, width, height, countdown, recording]);

  const speakLines = async (lines: string[]) => {
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
    const voice = await pickVoice(lang, 'female');
    const rate = Math.min(1.5, Math.max(0.25, guidanceRate));
    const pause = Math.min(4000, Math.max(400, guidancePauseMs));
    for (const line of lines) {
      if (cancelledRef.current) return;
      setCueText(line);
      setHighlightIndex(0);
      await speakText(line, {
        language: lang,
        voice: voice.id,
        rate,
        pitch: 1,
      });
      if (cancelledRef.current) return;
      await sleep(pause);
    }
  };

  const speakText = (
    text: string,
    opts: { language: string; voice?: string; rate: number; pitch: number }
  ) =>
    new Promise<void>((resolve) => {
      if (cancelledRef.current) {
        resolve();
        return;
      }
      const words = wordsOf(text);
      let usedBoundary = false;
      let settled = false;
      const started = Date.now();
      const estimatedMs = Math.max(800, words.join(' ').length * (72 / Math.max(0.25, opts.rate)));
      const tick = trackTimer(
        setInterval(() => {
          if (usedBoundary || cancelledRef.current || !mountedRef.current) return;
          const progress = (Date.now() - started) / estimatedMs;
          setHighlightIndex(wordIndexAtProgress(text, progress));
        }, 50)
      );

      const finish = () => {
        if (settled) return;
        settled = true;
        clearInterval(tick);
        resolve();
      };

      Speech.speak(text, {
        language: opts.language,
        voice: opts.voice,
        rate: opts.rate,
        pitch: opts.pitch,
        ...(Platform.OS === 'ios' ? { useApplicationAudioSession: false } : {}),
        onStart: () => {
          if (mountedRef.current && !cancelledRef.current) setHighlightIndex(0);
        },
        onBoundary: (ev: { charIndex?: number } | undefined) => {
          if (cancelledRef.current || !mountedRef.current) return;
          usedBoundary = true;
          const index = typeof ev?.charIndex === 'number' ? ev.charIndex : 0;
          setHighlightIndex(wordIndexAt(text, index));
        },
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    });

  const mixAudioWithCamera = async () => {
    try {
      // Camera owns the mic. Do not set allowsRecording — that steals the session
      // and drops the actor's voice after the first AI line.
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldRouteThroughEarpiece: false,
      });
    } catch {
      // Camera already owns the session; still try playback.
    }
  };

  const playRemoteAudio = (uri: string, text: string, marks?: DialogueWordMark[]) =>
    new Promise<boolean>((resolve) => {
      if (cancelledRef.current) {
        resolve(false);
        return;
      }
      let player = playerRef.current;
      try {
        if (player) {
          try {
            player.pause();
          } catch {
            // ignore
          }
          player.replace({ uri });
        } else {
          player = createAudioPlayer({ uri }, AUDIO_PLAYER_OPTS);
          playerRef.current = player;
        }
        player.volume = 1;
      } catch {
        resolve(false);
        return;
      }
      const active = player;
      const words = wordsOf(text);
      const aligned = alignTtsMarks(text, marks ?? []);
      const started = Date.now();
      const estimateMs = Math.max(2500, words.join(' ').length * 80);
      let retried = false;
      let settled = false;
      let sub: { remove: () => void } | undefined;

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        try {
          sub?.remove();
        } catch {
          // ignore
        }
        resolve(ok);
      };

      const highlight = (current: number, duration: number) => {
        if (!mountedRef.current) return;
        if (aligned.length) {
          setHighlightIndex(wordIndexAtTime(aligned, current - 0.06));
        } else if (duration > 0) {
          const lookahead = Math.min(0.28, 0.12 + duration * 0.02);
          setHighlightIndex(wordIndexAtProgress(text, (current + lookahead) / duration));
        } else {
          setHighlightIndex(wordIndexAtProgress(text, (Date.now() - started) / estimateMs));
        }
      };

      try {
        sub = active.addListener(
          'playbackStatusUpdate',
          (status: { didJustFinish?: boolean; currentTime?: number; duration?: number }) => {
            if (settled || cancelledRef.current) {
              finish(false);
              return;
            }
            highlight(audioSeconds(Number(status.currentTime ?? 0)), audioSeconds(Number(status.duration ?? 0)));
            if (status.didJustFinish && Date.now() - started > 250) finish(true);
          }
        );
      } catch {
        // poll only
      }

      void (async () => {
        const deadline = Date.now() + 8000;
        while (Date.now() < deadline && !cancelledRef.current && !settled) {
          try {
            if (active.isLoaded || audioSeconds(Number(active.duration ?? 0)) > 0) break;
          } catch {
            break;
          }
          await sleep(50);
        }
        if (cancelledRef.current || settled) return;
        await mixAudioWithCamera();
        if (cancelledRef.current || settled) return;
        try {
          active.play();
        } catch {
          finish(false);
        }
      })();

      const tick = trackTimer(
        setInterval(() => {
          if (settled) return;
          if (cancelledRef.current) {
            clearInterval(tick);
            finish(false);
            return;
          }
          let duration = 0;
          let current = 0;
          let playing = false;
          try {
            duration = audioSeconds(Number(active.duration ?? 0));
            current = audioSeconds(Number(active.currentTime ?? 0));
            playing = Boolean(active.playing);
          } catch {
            clearInterval(tick);
            finish(false);
            return;
          }
          highlight(current, duration);

          const elapsed = Date.now() - started;
          if (!retried && elapsed > 900 && current < 0.05 && !playing) {
            retried = true;
            void mixAudioWithCamera().then(() => {
              try {
                active.play();
              } catch {
                // ignore
              }
            });
          }

          const limit = Math.max(estimateMs + 2500, (duration || 0) * 1000 + 2500);
          if ((duration > 0 && current >= duration - 0.08) || elapsed > limit) {
            clearInterval(tick);
            finish(true);
          }
        }, 40)
      );
    });

  const sleepHold = (totalMs: number) =>
    new Promise<void>((resolve) => {
      const total = Math.max(0, Math.round(totalMs));
      if (total <= 0 || cancelledRef.current) {
        setCueHold(null);
        resolve();
        return;
      }
      const started = Date.now();
      setCueHold({ totalMs: total, leftMs: total });
      const tick = trackTimer(
        setInterval(() => {
          if (cancelledRef.current || !mountedRef.current) {
            clearInterval(tick);
            setCueHold(null);
            resolve();
            return;
          }
          const left = Math.max(0, total - (Date.now() - started));
          setCueHold({ totalMs: total, leftMs: left });
          if (left <= 0) {
            clearInterval(tick);
            setCueHold(null);
            resolve();
          }
        }, 40)
      );
    });

  const playParsedScript = async (script: DialogueScript) => {
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'tr-TR';
    const voice = await pickVoice(lang, script.voice);
    const rate = script.rate;
    const pitch = 1;

    await mixAudioWithCamera();
    await sleep(recordingRef.current ? 200 : 400);

    for (let i = 0; i < script.lines.length; i += 1) {
      const line = script.lines[i];
      if (cancelledRef.current) return;
      setCueLabel(
        line.speaker === 'actor' ? t('video.actorCue') : t('video.aiCue')
      );
      setCueText(line.text);
      setHighlightIndex(line.speaker === 'ai' ? 0 : -1);

      if (line.speaker === 'ai') {
        setCueHold(null);
        await mixAudioWithCamera();
        const played = line.audioUrl
          ? await playRemoteAudio(line.audioUrl, line.text, line.words)
          : false;
        // Speech steals the camera mic — only use it when not recording.
        if (!played && !cancelledRef.current && !recordingRef.current) {
          await speakText(line.text, { language: lang, voice: voice.id, rate, pitch });
        }
        if (cancelledRef.current) return;
        if (i < script.lines.length - 1) {
          await sleep(lineAfterSec(line.holdSec) * 1000);
        }
      } else {
        const afterMs = i < script.lines.length - 1 ? lineAfterSec(line.holdSec) * 1000 : 0;
        await sleepHold(estimateActorHoldMs(line.text) + afterMs);
      }
    }

    if (!cancelledRef.current) {
      setCueLabel(null);
      setCueText('');
      setHighlightIndex(-1);
      setCueHold(null);
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
      if (mountedRef.current) setPreviewing(false);
      stopDialogueAssist();
    }
  };

  const startDialogueAssist = async () => {
    if (guidanceLines?.length) {
      setCueLabel(t('video.mimicGuidance'));
      setCueText(guidanceLines[0] ?? '');
      void speakLines(guidanceLines);
      return;
    }
    if (dialogueMode === 'script_tts' && dialogueScript) {
      void playParsedScript(parseDialogueScript(dialogueScript));
    }
    if (dialogueMode === 'audio_file' && dialogueAudioUrl) {
      const player = createAudioPlayer({ uri: dialogueAudioUrl }, AUDIO_PLAYER_OPTS);
      player.volume = 1;
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
      Alert.alert(t('common.error'), localizedError(t, e));
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
        { text: t('media.pickFromGallery'), onPress: () => void pickFromLibrary() },
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

    recordingRef.current = true;
    setRecording(true);
    void (async () => {
      await sleep(650);
      if (cancelledRef.current || !recordingRef.current) return;
      await mixAudioWithCamera();
      await startDialogueAssist();
    })();

    let clipUri: string | null = null;
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration });
      clipUri = result?.uri ?? null;
    } catch (e: any) {
      const raw = String(e?.message ?? e ?? '');
      if (raw.includes('SimulatorNotSupported') || raw.toLowerCase().includes('simulator')) {
        Alert.alert(t('video.simulatorTitle'), t('video.simulatorBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('media.pickFromGallery'), onPress: () => void pickFromLibrary() },
        ]);
      } else if (!cancelledRef.current && mountedRef.current) {
        Alert.alert(t('common.error'), localizedError(t, e));
      }
    } finally {
      recordingRef.current = false;
      cancelledRef.current = true;
      holdCameraRef.current = true;
      if (mountedRef.current) {
        setRecording(false);
        setCueLabel(null);
        setCueText('');
        setHighlightIndex(-1);
        setCueHold(null);
      }
      stopDialogueAssist();
      // Unmounting CameraView in the same tick as stopRecording crashes iOS.
      await sleep(280);
      if (mountedRef.current && clipUri) setUri(clipUri);
      holdCameraRef.current = false;
    }
  };

  const stop = () => {
    if (!recordingRef.current) return;
    cancelledRef.current = true;
    clearAssistTimers();
    try {
      Speech.stop();
    } catch {
      // ignore
    }
    try {
      cameraRef.current?.stopRecording();
    } catch {
      recordingRef.current = false;
      if (mountedRef.current) setRecording(false);
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
            label={t('media.pickFromGallery')}
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
      </View>
    );
  }

  const edgeInset = isLandscape
    ? landscapeEdgeInset(insets)
    : Math.max(insets.left, insets.right, Spacing.md);
  const overlayPad = {
    paddingLeft: edgeInset,
    paddingRight: edgeInset,
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
              style={[styles.flipBtn, { top: 52, right: edgeInset }]}
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              hitSlop={12}
            >
              <Ionicons name="camera-reverse-outline" size={28} color={Colors.gold} />
              <Text style={styles.flipLabel}>{t('video.flipCamera')}</Text>
            </Pressable>
          ) : null}
          {dialogueMode === 'script_tts' || guidanceLines?.length ? (
            <Pressable
              style={[styles.dialogueToggle, { top: 52, left: edgeInset }]}
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
            <DialogueWords
              text={cueText}
              label={cueLabel}
              highlightIndex={highlightIndex}
              holdLeftMs={cueHold?.leftMs}
              holdTotalMs={cueHold?.totalMs}
              holdCaption={
                cueHold
                  ? t('video.actorTimeLeft', {
                      seconds: (cueHold.leftMs / 1000).toFixed(1),
                    })
                  : null
              }
              style={{ left: edgeInset, right: edgeInset, bottom: 76 }}
            />
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
        {hint && !uri && !recording && !previewing ? <Text style={styles.mode}>{hint}</Text> : null}
        {(dialogueMode !== 'none' || guidanceLines?.length) && !uri && !recording && !previewing ? (
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
            {previewing ? (
              <Button
                label={t('video.stopPreview')}
                variant="secondary"
                style={styles.recBtn}
                onPress={() => {
                  cancelledRef.current = true;
                  stopDialogueAssist();
                  setPreviewing(false);
                  setCueLabel(null);
                  setCueText('');
                  setHighlightIndex(-1);
                  setCueHold(null);
                }}
              />
            ) : recording ? (
              <Pressable
                onPress={stop}
                style={({ pressed }) => [styles.stopCam, pressed && { opacity: 0.85 }]}
                hitSlop={12}
                accessibilityLabel={t('video.stop')}
              >
                <View style={styles.stopCamInner} />
              </Pressable>
            ) : (
              <>
                {dialogueMode === 'script_tts' && dialogueScript && !isSimulator ? (
                  <Button
                    label={t('video.previewScript')}
                    variant="secondary"
                    style={styles.recBtn}
                    onPress={() => void previewScript()}
                    disabled={countdown !== null}
                  />
                ) : null}
                {isSimulator ? (
                  <Button
                    label={t('media.pickFromGallery')}
                    style={styles.recBtn}
                    onPress={() => void pickFromLibrary()}
                  />
                ) : (
                  <Button
                    label={t('video.start')}
                    onPress={() => void start()}
                    disabled={!isLandscape}
                    style={styles.recBtn}
                  />
                )}
              </>
            )}
            {allowLibrary && !busy && !previewing ? (
              <Button
                label={t('media.pickFromGallery')}
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
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: 76,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(20,8,32,0.72)',
  },
  dialogueWho: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.gold,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  dialogueLine: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textOnDark,
  },
  dialogueWord: {
    color: 'rgba(255,255,255,0.55)',
  },
  dialogueWordOn: {
    color: '#FFFFFF',
    fontFamily: Fonts.bodyBold,
  },
  holdWrap: {
    marginTop: 6,
    gap: 4,
  },
  holdTrack: {
    height: 4,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  holdFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: Colors.gold,
  },
  holdCaption: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.textOnDark,
    opacity: 0.9,
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
  stopCam: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  stopCamInner: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: Colors.danger,
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
