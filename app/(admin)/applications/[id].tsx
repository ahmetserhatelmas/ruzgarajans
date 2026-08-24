import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { IntroVideoCard } from '@/components/video/IntroVideoCard';
import { VideoPlayerModal } from '@/components/video/VideoPlayerModal';
import { fetchActorDetail } from '@/services/actors';
import { supabase } from '@/lib/supabase';
import type { ActorProfile, ApplicationStatus, Profile, Video } from '@/types/database';
import { optionLabel } from '@/lib/optionLabel';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type AppDetail = {
  id: string;
  actor_id: string;
  cast_id: string;
  status: ApplicationStatus;
  accept_budget: boolean;
  counter_budget: number | null;
  note: string | null;
  created_at: string;
  cast_listings: {
    project_name: string;
    role_name: string;
    role_description: string;
    deadline: string | null;
    option_date: string | null;
    payment_due_date: string | null;
    budget_amount: number | null;
    budget_currency: string;
  } | null;
};

export default function AdminApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [app, setApp] = useState<AppDetail | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actor, setActor] = useState<ActorProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [playing, setPlaying] = useState<{ uri: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('applications')
      .select(
        'id, actor_id, cast_id, status, accept_budget, counter_budget, note, created_at, cast_listings(project_name, role_name, role_description, deadline, option_date, payment_due_date, budget_amount, budget_currency)'
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      setApp(null);
      return;
    }
    const row = data as unknown as AppDetail;
    setApp(row);

    const [{ profile: p, actor: a }, vidsByApp, vidsByCast] = await Promise.all([
      fetchActorDetail(row.actor_id),
      supabase
        .from('videos')
        .select('*')
        .eq('application_id', row.id)
        .eq('kind', 'audition')
        .eq('status', 'ready'),
      supabase
        .from('videos')
        .select('*')
        .eq('cast_id', row.cast_id)
        .eq('user_id', row.actor_id)
        .eq('kind', 'audition')
        .eq('status', 'ready'),
    ]);
    setProfile(p);
    setActor(a);

    const merged: Video[] = [];
    for (const v of [...((vidsByApp.data as Video[]) ?? []), ...((vidsByCast.data as Video[]) ?? [])]) {
      if (!merged.some((x) => x.id === v.id)) merged.push(v);
    }
    setVideos(merged);
  }, [id]);

  useEffect(() => {
    load().catch((e) => Alert.alert(t('common.error'), e?.message ?? t('common.error')));
  }, [load, t]);

  const setStatus = async (status: ApplicationStatus) => {
    if (!app) return;
    try {
      setBusy(true);
      const { error } = await supabase.from('applications').update({ status }).eq('id', app.id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!app) return;
    Alert.alert(t('admin.deleteApplication'), t('admin.deleteApplicationConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            const { error } = await supabase.from('applications').delete().eq('id', app.id);
            if (error) throw error;
            router.replace('/(admin)/applications');
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message ?? t('common.error'));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (!app) {
    return (
      <Screen>
        <BackHeader fallbackHref="/(admin)/applications" />
        <Text style={styles.meta}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  const project = app.cast_listings?.project_name ?? '—';
  const role = app.cast_listings?.role_name ?? '—';
  const actorName = profile?.full_name || profile?.email || '—';

  return (
    <Screen scroll>
      <BackHeader fallbackHref="/(admin)/applications" />
      <Text style={styles.title}>{project}</Text>
      <Text style={styles.sub}>
        {t('cast.role')}: {role}
      </Text>
      <Text style={styles.status}>
        {t('cast.status')}: {t(`status.${app.status}` as any)}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('admin.applicant')}</Text>
        <Text style={styles.name}>{actorName}</Text>
        <Text style={styles.meta}>{profile?.email}</Text>
        {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
        <Button
          label={t('admin.viewProfile')}
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/(admin)/actors/[id]',
              params: {
                id: app.actor_id,
                returnTo: `/(admin)/applications/${app.id}`,
              },
            })
          }
          style={{ marginTop: Spacing.sm }}
        />
      </View>

      <Text style={styles.section}>{t('profile.physical')}</Text>
      <Text style={styles.line}>
        {t('profile.height')}: {actor?.height_cm ?? '—'} · {t('profile.weight')}:{' '}
        {actor?.weight_kg ?? '—'} · {t('profile.hair')}: {optionLabel(t, 'hair', actor?.hair_color)} ·{' '}
        {t('profile.eyes')}: {optionLabel(t, 'eyes', actor?.eye_color)}
      </Text>
      <Text style={styles.section}>{t('profile.bio')}</Text>
      <Text style={styles.line}>{actor?.bio || '—'}</Text>
      <Text style={styles.section}>{t('profile.experience')}</Text>
      <Text style={styles.line}>{actor?.experience || '—'}</Text>
      <Text style={styles.section}>{t('profile.introVideo')}</Text>
      <IntroVideoCard
        playbackUrl={actor?.intro_video_playback_url}
        videoId={actor?.intro_video_id}
        title={`${actorName} · ${t('profile.introVideo')}`}
      />

      <Text style={styles.section}>{t('admin.applicationDetails')}</Text>
      <Text style={styles.line}>{app.cast_listings?.role_description || '—'}</Text>
      <Text style={styles.meta}>
        {t('cast.deadline')}: {app.cast_listings?.deadline ?? '—'}
      </Text>
      <Text style={styles.meta}>
        {t('cast.optionDate')}: {app.cast_listings?.option_date ?? '—'}
      </Text>
      <Text style={styles.meta}>
        {t('cast.paymentDue')}: {app.cast_listings?.payment_due_date ?? '—'}
      </Text>
      <Text style={styles.meta}>
        {t('cast.budget')}:{' '}
        {app.cast_listings?.budget_amount != null
          ? `${app.cast_listings.budget_amount.toLocaleString('tr-TR')} ${app.cast_listings.budget_currency}`
          : '—'}
      </Text>
      {!app.accept_budget && app.counter_budget != null ? (
        <Text style={styles.offer}>
          {t('admin.budgetOffers')}: {app.counter_budget.toLocaleString('tr-TR')} TRY
        </Text>
      ) : (
        <Text style={styles.meta}>{t('cast.acceptBudget')}</Text>
      )}
      {app.note ? (
        <>
          <Text style={styles.section}>Not</Text>
          <Text style={styles.line}>{app.note}</Text>
        </>
      ) : null}

      <Text style={styles.section}>
        {t('admin.auditionVideos')} ({videos.length})
      </Text>
      {videos.length === 0 ? (
        <Text style={styles.meta}>{t('admin.noAuditionVideo')}</Text>
      ) : (
        videos.map((v) => (
          <Button
            key={v.id}
            label={t('admin.watchVideo')}
            variant="secondary"
            style={{ marginBottom: Spacing.sm }}
            onPress={() => {
              if (!v.playback_url) {
                Alert.alert(t('common.error'), t('admin.videoNotReady'));
                return;
              }
              setPlaying({ uri: v.playback_url, title: `${actorName} · ${project}` });
            }}
          />
        ))
      )}

      <View style={styles.actions}>
        <Button
          label={t('status.shortlisted')}
          variant="secondary"
          disabled={busy}
          onPress={() => void setStatus('shortlisted')}
          style={{ flex: 1 }}
        />
        <Button
          label={t('status.audition_invited')}
          disabled={busy}
          onPress={() => void setStatus('audition_invited')}
          style={{ flex: 1 }}
        />
      </View>
      <Button
        label={t('status.accepted')}
        variant="secondary"
        disabled={busy}
        onPress={() => void setStatus('accepted')}
        style={{ marginTop: Spacing.sm }}
      />
      <Button
        label={t('admin.deleteApplication')}
        variant="danger"
        disabled={busy}
        onPress={onDelete}
        style={{ marginTop: Spacing.md, marginBottom: Spacing.xxl }}
      />

      <VideoPlayerModal
        visible={!!playing}
        uri={playing?.uri ?? null}
        title={playing?.title}
        onClose={() => setPlaying(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    color: Colors.ink,
    marginTop: Spacing.md,
  },
  sub: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.goldDeep,
    marginBottom: Spacing.xs,
  },
  status: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  name: {
    fontFamily: Fonts.displayBold,
    fontSize: 26,
    color: Colors.ink,
  },
  meta: { fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2 },
  section: {
    fontFamily: Fonts.bodyBold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  line: { fontFamily: Fonts.body, color: Colors.text, lineHeight: 22 },
  offer: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.goldDeep,
    marginTop: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
});
