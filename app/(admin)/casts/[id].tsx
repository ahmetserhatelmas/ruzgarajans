import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { fetchCastById, updateCast } from '@/services/casts';
import { fetchVideosForCast } from '@/services/videos';
import { supabase } from '@/lib/supabase';
import type { Application, CastListing, Video } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DialogueFields } from '@/components/cast/DialogueFields';
import { parseDialogueScript, stringifyDialogueScript } from '@/lib/dialogueScript';
import { sanitizeIsoDateInput } from '@/lib/isoDate';

export default function AdminCastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [cast, setCast] = useState<CastListing | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [location, setLocation] = useState('');
  const [shootDate, setShootDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [optionDate, setOptionDate] = useState('');
  const [paymentDue, setPaymentDue] = useState('');
  const [budget, setBudget] = useState('');
  const [allowCounter, setAllowCounter] = useState(true);
  const [dialogueScript, setDialogueScript] = useState('');
  const [publish, setPublish] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const c = await fetchCastById(id);
      setCast(c);
      if (c) {
        setProjectName(c.project_name);
        setRoleName(c.role_name);
        setRoleDescription(c.role_description);
        setAgeMin(c.age_min != null ? String(c.age_min) : '');
        setAgeMax(c.age_max != null ? String(c.age_max) : '');
        setHeightMin(c.height_min_cm != null ? String(c.height_min_cm) : '');
        setHeightMax(c.height_max_cm != null ? String(c.height_max_cm) : '');
        setLocation(c.shoot_location ?? '');
        setShootDate(c.shoot_date ?? '');
        setDeadline(c.deadline ?? '');
        setOptionDate(c.option_date ?? '');
        setPaymentDue(c.payment_due_date ?? '');
        setBudget(c.budget_amount != null ? String(c.budget_amount) : '');
        setAllowCounter(c.allow_budget_counter);
        setDialogueScript(c.dialogue_script ?? '');
        setPublish(c.is_published);
      }
      const [{ data: a }, v] = await Promise.all([
        supabase.from('applications').select('*').eq('cast_id', id),
        fetchVideosForCast(id),
      ]);
      setApps((a as Application[]) ?? []);
      setVideos(v);
    })().catch(() => undefined);
  }, [id]);

  const onSave = async () => {
    if (!id || !cast) return;
    if (!projectName.trim() || !roleName.trim() || !roleDescription.trim()) {
      Alert.alert(t('common.error'), t('common.required'));
      return;
    }
    try {
      setLoading(true);
      const updated = await updateCast(id, {
        project_name: projectName.trim(),
        role_name: roleName.trim(),
        role_description: roleDescription.trim(),
        age_min: ageMin ? Number(ageMin) : null,
        age_max: ageMax ? Number(ageMax) : null,
        height_min_cm: heightMin ? Number(heightMin) : null,
        height_max_cm: heightMax ? Number(heightMax) : null,
        shoot_location: location.trim() || null,
        shoot_date: shootDate || null,
        deadline: deadline || null,
        option_date: optionDate || null,
        payment_due_date: paymentDue || null,
        budget_amount: budget ? Number(budget) : null,
        allow_budget_counter: allowCounter,
        dialogue_mode: parseDialogueScript(dialogueScript).lines.length ? 'script_tts' : 'none',
        dialogue_script: stringifyDialogueScript(parseDialogueScript(dialogueScript)) || null,
        is_published: publish,
      });
      setCast(updated);
      Alert.alert(t('common.success'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!cast) {
    return (
      <Screen>
        <BackHeader fallbackHref="/(admin)/casts" />
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BackHeader fallbackHref="/(admin)/casts" />
      <Text style={styles.title}>{t('admin.editCast')}</Text>

      <TextField label={t('cast.project')} value={projectName} onChangeText={setProjectName} />
      <TextField label={t('cast.role')} value={roleName} onChangeText={setRoleName} />
      <TextField
        label="Rol açıklaması"
        value={roleDescription}
        onChangeText={setRoleDescription}
        multiline
      />
      <TextField label="Yaş min" value={ageMin} onChangeText={setAgeMin} keyboardType="numeric" />
      <TextField label="Yaş max" value={ageMax} onChangeText={setAgeMax} keyboardType="numeric" />
      <TextField label="Boy min" value={heightMin} onChangeText={setHeightMin} keyboardType="numeric" />
      <TextField label="Boy max" value={heightMax} onChangeText={setHeightMax} keyboardType="numeric" />
      <TextField label={t('cast.location')} value={location} onChangeText={setLocation} />
      <TextField
        label={`${t('cast.shootDate')} (YYYY-MM-DD)`}
        value={shootDate}
        onChangeText={(v) => setShootDate(sanitizeIsoDateInput(v))}
      />
      <TextField
        label={`${t('cast.deadline')} (YYYY-MM-DD)`}
        value={deadline}
        onChangeText={(v) => setDeadline(sanitizeIsoDateInput(v))}
      />
      <TextField
        label={`${t('cast.optionDate')} (YYYY-MM-DD)`}
        value={optionDate}
        onChangeText={(v) => setOptionDate(sanitizeIsoDateInput(v))}
      />
      <TextField
        label={`${t('cast.paymentDue')} (YYYY-MM-DD)`}
        value={paymentDue}
        onChangeText={(v) => setPaymentDue(sanitizeIsoDateInput(v))}
      />
      <TextField
        label={t('cast.budget')}
        value={budget}
        onChangeText={setBudget}
        keyboardType="numeric"
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('cast.counterBudget')}</Text>
        <Switch value={allowCounter} onValueChange={setAllowCounter} />
      </View>
      <DialogueFields value={dialogueScript} onChange={setDialogueScript} />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('admin.publish')}</Text>
        <Switch value={publish} onValueChange={setPublish} />
      </View>
      <Button label={t('common.save')} onPress={onSave} loading={loading} />

      <Text style={styles.section}>
        {t('admin.applications')} ({apps.length})
      </Text>
      {apps.map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={styles.line}>
            {a.actor_id.slice(0, 8)}… · {t(`status.${a.status}` as any)}
          </Text>
          {!a.accept_budget && a.counter_budget != null ? (
            <Text style={styles.offer}>
              {t('admin.budgetOffers')}: {a.counter_budget}
            </Text>
          ) : null}
        </View>
      ))}

      <Text style={styles.section}>
        {t('cast.audition')} / Videolar ({videos.length})
      </Text>
      <FlatList
        data={videos}
        scrollEnabled={false}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.line}>
              {item.kind} · {item.status}
            </Text>
            <Text style={styles.offer} numberOfLines={2}>
              {item.playback_url || item.cf_uid}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    marginVertical: Spacing.md,
  },
  muted: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  switchLabel: { fontFamily: Fonts.bodyMedium, color: Colors.text },
  section: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  line: { fontFamily: Fonts.bodyMedium, color: Colors.ink },
  offer: { fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 4 },
});
