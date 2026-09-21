import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { localizedError } from '@/lib/authErrors';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCasts } from '@/lib/access';
import { pickFromLibrary } from '@/lib/pickMedia';
import { fetchMyAuditionVideos, recordAndUploadVideo } from '@/services/videos';
import {
  applyToCast,
  fetchCastById,
  fetchIntroductionForCast,
  fetchMyApplications,
  fetchOptionForCast,
  respondToCastOption,
} from '@/services/casts';
import type { Application, CastListing, CastOption, Video } from '@/types/database';
import { countryLabel } from '@/constants/countries';
import { languageLabel } from '@/constants/languages';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function CastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user, profile, actorProfile, galleryPhotos } = useAuth();
  const router = useRouter();
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);
  const [cast, setCast] = useState<CastListing | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [acceptBudget, setAcceptBudget] = useState(true);
  const [counter, setCounter] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [introduced, setIntroduced] = useState(false);
  const [option, setOption] = useState<CastOption | null>(null);
  const [optionLoading, setOptionLoading] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [auditionUploading, setAuditionUploading] = useState(false);
  const [auditionVideo, setAuditionVideo] = useState<Video | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const applyY = useRef(0);

  const revealApply = () => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, applyY.current - 12),
      animated: true,
    });
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(revealApply, 50);
    });
    return () => show.remove();
  }, []);

  const loadCast = useCallback(() => {
    if (!id || !user || !castOk) return;
    let active = true;
    (async () => {
      const [c, apps, intro, opt, vids] = await Promise.all([
        fetchCastById(id),
        fetchMyApplications(user.id),
        fetchIntroductionForCast(id, user.id),
        fetchOptionForCast(id, user.id),
        fetchMyAuditionVideos(user.id, id),
      ]);
      if (!active) return;
      setCast(c);
      setApp(apps.find((a) => a.cast_id === id) ?? null);
      setIntroduced(intro);
      setOption(opt);
      setAuditionVideo(vids.find((v) => v.status === 'ready') ?? vids[0] ?? null);
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, user, castOk]);

  useFocusEffect(
    useCallback(() => {
      return loadCast();
    }, [loadCast])
  );

  if (!castOk) {
    return (
      <Screen scroll>
        <BackHeader fallbackHref="/(actor)/cast" />
        <AccessGateCard />
        <MediaAccessCard />
      </Screen>
    );
  }

  const onOption = async (status: 'accepted' | 'declined') => {
    if (!user || !cast) return;
    try {
      setOptionLoading(true);
      const next = await respondToCastOption(
        cast.id,
        user.id,
        status,
        status === 'declined' ? declineReason : null
      );
      setOption(next);
      setDeclineOpen(false);
      setDeclineReason('');
      Alert.alert(t('common.success'), t('cast.optionSaved'));
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setOptionLoading(false);
    }
  };

  const onApply = async () => {
    if (!user || !cast) return;
    try {
      setLoading(true);
      const created = await applyToCast({
        castId: cast.id,
        actorId: user.id,
        acceptBudget,
        counterBudget: counter ? Number(counter) : null,
        note,
      });
      setApp(created);
      Alert.alert(t('common.success'), t('cast.applied'));
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const pickAudition = async () => {
    try {
      const asset = await pickFromLibrary('videos');
      if (!asset) return;
      setPendingUri(asset.uri);
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    }
  };

  const sendPending = async () => {
    if (!user || !app || !pendingUri || !cast) return;
    try {
      setAuditionUploading(true);
      const row = await recordAndUploadVideo({
        localUri: pendingUri,
        userId: user.id,
        kind: 'audition',
        castId: cast.id,
        applicationId: app.id,
        title: cast.project_name ?? 'Audition',
      });
      setAuditionVideo(row);
      setPendingUri(null);
      Alert.alert(t('cast.videoSentAlert'));
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setAuditionUploading(false);
    }
  };

  if (!cast) {
    return (
      <Screen>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll ref={scrollRef}>
      <BackHeader fallbackHref="/(actor)/cast" />
      <View style={styles.hero}>
        {cast.cover_image_url ? (
          <Image source={{ uri: cast.cover_image_url }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoEmpty]} />
        )}
        <View style={styles.heroCopy}>
          <Text style={styles.project}>{cast.project_name}</Text>
          <Text style={styles.role}>
            {t('cast.role')}: {cast.role_name}
          </Text>
        </View>
      </View>
      <Text style={styles.desc}>{cast.role_description}</Text>

      {option ? (
        <View style={styles.introBanner}>
          <Text style={styles.introTitle}>
            {option.status === 'pending'
              ? t('cast.optionAsk')
              : option.status === 'accepted'
                ? t('cast.optionAccepted')
                : t('cast.optionDeclined')}
          </Text>
          {option.status === 'pending' && !declineOpen ? (
            <>
              <Text style={styles.introHint}>{t('cast.optionAskHint')}</Text>
              <View style={styles.optionRow}>
                <Button
                  label={t('cast.optionYes')}
                  onPress={() => void onOption('accepted')}
                  loading={optionLoading}
                  style={styles.optionBtn}
                />
                <Button
                  label={t('cast.optionNo')}
                  variant="secondary"
                  onPress={() => setDeclineOpen(true)}
                  disabled={optionLoading}
                  style={styles.optionBtn}
                />
              </View>
            </>
          ) : null}
          {option.status === 'pending' && declineOpen ? (
            <>
              <Text style={styles.introHint}>{t('cast.optionNoReasonHint')}</Text>
              <TextField
                label={t('cast.optionNoReason')}
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
                style={styles.reasonInput}
              />
              <View style={styles.optionRow}>
                <Button
                  label={t('cast.optionNoSend')}
                  variant="secondary"
                  onPress={() => void onOption('declined')}
                  loading={optionLoading}
                  style={styles.optionBtn}
                />
                <Button
                  label={t('cast.optionNoCancel')}
                  variant="ghost"
                  onPress={() => {
                    setDeclineOpen(false);
                    setDeclineReason('');
                  }}
                  disabled={optionLoading}
                  style={styles.optionBtn}
                />
              </View>
            </>
          ) : null}
          {option.status === 'declined' && option.decline_reason ? (
            <Text style={styles.introHint}>
              {t('cast.optionDeclineReason', { reason: option.decline_reason })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {introduced ? (
        <View style={styles.introBanner}>
          <Text style={styles.introTitle}>{t('cast.introduced')}</Text>
          <Text style={styles.introHint}>{t('cast.introducedHint')}</Text>
        </View>
      ) : null}

      <View style={styles.meta}>
        <Meta label={t('cast.ageRange')} value={`${cast.age_min ?? '—'}–${cast.age_max ?? '—'}`} />
        <Meta label={t('cast.gender')} value={cast.gender} />
        <Meta
          label={t('cast.heightRange')}
          value={`${cast.height_min_cm ?? '—'}–${cast.height_max_cm ?? '—'} cm`}
        />
        <Meta
          label={t('cast.nationality')}
          value={
            cast.nationalities?.length
              ? cast.nationalities.map((code) => countryLabel(code, i18n.language)).join(', ')
              : '—'
          }
        />
        <Meta
          label={t('cast.languages')}
          value={
            cast.languages?.length
              ? cast.languages.map((code) => languageLabel(code, i18n.language)).join(', ')
              : '—'
          }
        />
        <Meta label={t('cast.shootDate')} value={cast.shoot_date ?? '—'} />
        <Meta label={t('cast.location')} value={cast.shoot_location ?? '—'} />
        <Meta label={t('cast.deadline')} value={cast.deadline ?? '—'} />
        <Meta label={t('cast.optionDate')} value={cast.option_date ?? '—'} />
        <Meta label={t('cast.paymentDue')} value={cast.payment_due_date ?? '—'} />
        <Meta
          label={t('cast.budget')}
          value={
            cast.budget_amount != null
              ? `${cast.budget_amount.toLocaleString()} ${cast.budget_currency}`
              : '—'
          }
        />
      </View>

      {app ? (
        <View style={styles.statusBox}>
          <Text style={styles.status}>
            {t('cast.status')}: {t(`status.${app.status}` as any)}
          </Text>
          {cast.requires_video !== false ? (
            <Text style={auditionVideo?.status === 'ready' ? styles.status : styles.statusMuted}>
              {t('cast.videoLabel')}:{' '}
              {auditionVideo?.status === 'ready'
                ? t('cast.videoSent')
                : t('cast.videoNotSent')}
            </Text>
          ) : null}
        </View>
      ) : (
        <View
          collapsable={false}
          style={styles.applyBox}
          onLayout={(e) => {
            applyY.current = e.nativeEvent.layout.y;
          }}
        >
          {cast.allow_budget_counter ? (
            <>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t('cast.acceptBudget')}</Text>
                <Switch value={acceptBudget} onValueChange={setAcceptBudget} />
              </View>
              {!acceptBudget ? (
                <>
                  <Text style={styles.hint}>{t('cast.counterHint')}</Text>
                  <TextField
                    label={t('cast.yourOffer')}
                    keyboardType="numeric"
                    value={counter}
                    onChangeText={setCounter}
                    onFocus={() => setTimeout(revealApply, 80)}
                  />
                </>
              ) : null}
            </>
          ) : null}
          <TextField
            label="Not"
            value={note}
            onChangeText={setNote}
            multiline
            onFocus={() => setTimeout(revealApply, 80)}
          />
          <Button label={t('cast.apply')} onPress={onApply} loading={loading} />
        </View>
      )}

      {cast.requires_video !== false ? (
        <View style={styles.auditionBox}>
          <Text style={styles.hint}>{t('cast.auditionHint')}</Text>
          {!app ? <Text style={styles.hint}>{t('cast.auditionNeedApply')}</Text> : null}
          {pendingUri ? (
            <>
              <Text style={styles.hint}>{t('cast.previewPickHint')}</Text>
              <PickedPreview uri={pendingUri} />
              <Button
                label={t('cast.sendVideo')}
                onPress={() => void sendPending()}
                loading={auditionUploading}
                disabled={!app || auditionUploading}
              />
              <Button
                label={t('cast.pickAnother')}
                variant="secondary"
                disabled={auditionUploading}
                onPress={() => void pickAudition()}
              />
              <Button
                label={t('common.cancel')}
                variant="ghost"
                disabled={auditionUploading}
                onPress={() => setPendingUri(null)}
              />
            </>
          ) : (
            <>
              <Button
                label={t('media.takeNow')}
                variant={app ? 'primary' : 'secondary'}
                disabled={!app}
                onPress={() =>
                  router.push({
                    pathname: '/record/audition',
                    params: {
                      castId: cast.id,
                      ...(app?.id ? { applicationId: app.id } : {}),
                    },
                  })
                }
              />
              <Button
                label={t('media.pickFromGallery')}
                variant="secondary"
                disabled={!app}
                onPress={() => void pickAudition()}
              />
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function PickedPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // ignore
      }
    };
  }, [player]);

  return (
    <View style={styles.preview}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.paperMuted,
  },
  logoEmpty: {
    backgroundColor: Colors.border,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  project: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    color: Colors.ink,
  },
  role: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.goldDeep,
    marginTop: 4,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  introBanner: {
    backgroundColor: Colors.paperMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 4,
  },
  introTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.brandDeep,
  },
  introHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  optionBtn: {
    flex: 1,
  },
  reasonInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  meta: { gap: Spacing.sm, marginBottom: Spacing.lg },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  metaLabel: { fontFamily: Fonts.body, color: Colors.textMuted, fontSize: 14 },
  metaValue: { fontFamily: Fonts.bodyMedium, color: Colors.text, fontSize: 14 },
  applyBox: { gap: Spacing.md },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: { fontFamily: Fonts.bodyMedium, color: Colors.text },
  hint: { fontFamily: Fonts.body, color: Colors.textMuted, fontSize: 13 },
  statusBox: { gap: 4, marginBottom: Spacing.md },
  status: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.success,
  },
  statusMuted: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.textMuted,
  },
  muted: { fontFamily: Fonts.body, color: Colors.textMuted, marginTop: Spacing.xl },
  auditionBox: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.ink,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
});
