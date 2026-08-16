import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AccessGateCard, MediaAccessCard } from '@/components/ui/AccessGateCard';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessCasts } from '@/lib/access';
import { applyToCast, fetchCastById, fetchMyApplications } from '@/services/casts';
import type { Application, CastListing } from '@/types/database';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function CastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, profile, actorProfile, galleryPhotos } = useAuth();
  const router = useRouter();
  const castOk = canAccessCasts(profile, actorProfile, galleryPhotos);
  const [cast, setCast] = useState<CastListing | null>(null);
  const [app, setApp] = useState<Application | null>(null);
  const [acceptBudget, setAcceptBudget] = useState(true);
  const [counter, setCounter] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || !user || !castOk) return;
    (async () => {
      const c = await fetchCastById(id);
      setCast(c);
      const apps = await fetchMyApplications(user.id);
      setApp(apps.find((a) => a.cast_id === id) ?? null);
    })().catch(() => undefined);
  }, [id, user, castOk]);

  if (!castOk) {
    return (
      <Screen scroll>
        <BackHeader fallbackHref="/(actor)/cast" />
        <AccessGateCard />
        <MediaAccessCard />
      </Screen>
    );
  }

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
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
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
    <Screen scroll>
      <BackHeader fallbackHref="/(actor)/cast" />
      <Text style={styles.project}>{cast.project_name}</Text>
      <Text style={styles.role}>
        {t('cast.role')}: {cast.role_name}
      </Text>
      <Text style={styles.desc}>{cast.role_description}</Text>

      <View style={styles.meta}>
        <Meta label={t('cast.ageRange')} value={`${cast.age_min ?? '—'}–${cast.age_max ?? '—'}`} />
        <Meta label={t('cast.gender')} value={cast.gender} />
        <Meta
          label={t('cast.heightRange')}
          value={`${cast.height_min_cm ?? '—'}–${cast.height_max_cm ?? '—'} cm`}
        />
        <Meta label={t('cast.shootDate')} value={cast.shoot_date ?? '—'} />
        <Meta label={t('cast.location')} value={cast.shoot_location ?? '—'} />
        <Meta label={t('cast.deadline')} value={cast.deadline ?? '—'} />
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
        <Text style={styles.status}>
          {t('cast.status')}: {t(`status.${app.status}` as any)}
        </Text>
      ) : (
        <View style={styles.applyBox}>
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
                  />
                </>
              ) : null}
            </>
          ) : null}
          <TextField label="Not" value={note} onChangeText={setNote} multiline />
          <Button label={t('cast.apply')} onPress={onApply} loading={loading} />
        </View>
      )}

      <View style={styles.auditionBox}>
        <Text style={styles.hint}>{t('cast.auditionHint')}</Text>
        {!app ? <Text style={styles.hint}>{t('cast.auditionNeedApply')}</Text> : null}
        <Button
          label={t('cast.audition')}
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
      </View>
    </Screen>
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
  project: {
    fontFamily: Fonts.displayBold,
    fontSize: 40,
    color: Colors.ink,
    marginTop: Spacing.md,
  },
  role: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.goldDeep,
    marginBottom: Spacing.md,
  },
  desc: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.lg,
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
  status: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.success,
    marginBottom: Spacing.md,
  },
  muted: { fontFamily: Fonts.body, color: Colors.textMuted, marginTop: Spacing.xl },
  auditionBox: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
});
