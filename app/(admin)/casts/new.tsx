import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { createCast } from '@/services/casts';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { DialogueFields } from '@/components/cast/DialogueFields';
import { stringifyDialogueScript, parseDialogueScript } from '@/lib/dialogueScript';
import { sanitizeIsoDateInput } from '@/lib/isoDate';

export default function NewCastScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
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
  const [requiresVideo, setRequiresVideo] = useState(true);
  const [dialogueScript, setDialogueScript] = useState('');
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const cast = await createCast({
        created_by: user.id,
        project_name: projectName,
        role_name: roleName,
        role_description: roleDescription,
        age_min: ageMin ? Number(ageMin) : null,
        age_max: ageMax ? Number(ageMax) : null,
        height_min_cm: heightMin ? Number(heightMin) : null,
        height_max_cm: heightMax ? Number(heightMax) : null,
        shoot_location: location,
        shoot_date: shootDate || null,
        deadline: deadline || null,
        option_date: optionDate || null,
        payment_due_date: paymentDue || null,
        budget_amount: budget ? Number(budget) : null,
        allow_budget_counter: allowCounter,
        requires_video: requiresVideo,
        dialogue_mode:
          requiresVideo && parseDialogueScript(dialogueScript).lines.length ? 'script_tts' : 'none',
        dialogue_script: requiresVideo
          ? stringifyDialogueScript(parseDialogueScript(dialogueScript)) || null
          : null,
        is_published: publish,
        gender: 'any',
        budget_currency: 'TRY',
      });
      router.replace(`/(admin)/casts/${cast.id}`);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <BackHeader fallbackHref="/(admin)/casts" />
      <Text style={styles.title}>{t('admin.newCast')}</Text>
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
      <TextField label={`${t('cast.shootDate')} (YYYY-MM-DD)`} value={shootDate} onChangeText={(v) => setShootDate(sanitizeIsoDateInput(v))} />
      <TextField label={`${t('cast.deadline')} (YYYY-MM-DD)`} value={deadline} onChangeText={(v) => setDeadline(sanitizeIsoDateInput(v))} />
      <TextField label={`${t('cast.optionDate')} (YYYY-MM-DD)`} value={optionDate} onChangeText={(v) => setOptionDate(sanitizeIsoDateInput(v))} />
      <TextField label={`${t('cast.paymentDue')} (YYYY-MM-DD)`} value={paymentDue} onChangeText={(v) => setPaymentDue(sanitizeIsoDateInput(v))} />
      <TextField label={t('cast.budget')} value={budget} onChangeText={setBudget} keyboardType="numeric" />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('cast.counterBudget')}</Text>
        <Switch value={allowCounter} onValueChange={setAllowCounter} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('cast.requiresVideo')}</Text>
        <Switch value={requiresVideo} onValueChange={setRequiresVideo} />
      </View>
      {requiresVideo ? <DialogueFields value={dialogueScript} onChange={setDialogueScript} /> : null}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('admin.publish')}</Text>
        <Switch value={publish} onValueChange={setPublish} />
      </View>
      <Button label={t('common.save')} onPress={onSave} loading={loading} />
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  switchLabel: { fontFamily: Fonts.bodyMedium, color: Colors.text },
});
