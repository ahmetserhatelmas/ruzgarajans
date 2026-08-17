import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  isFormSectionSaved,
  isMediaSectionSaved,
  registrationStepCount,
} from '@/lib/access';
import { updateActorProfile, updateProfileBasics } from '@/services/actors';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export function RegistrationSteps() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile, actorProfile, galleryPhotos, refreshProfile } = useAuth();
  const [sending, setSending] = useState(false);

  if (actorProfile?.registration_completed_at) return null;

  const formOk = isFormSectionSaved(actorProfile);
  const mediaOk = isMediaSectionSaved(profile, actorProfile, galleryPhotos);
  const done = registrationStepCount(profile, actorProfile, galleryPhotos);
  const canSubmit = done === 2;

  const onSubmit = async () => {
    if (!user || !canSubmit) return;
    try {
      setSending(true);
      await updateProfileBasics(user.id, { actor_status: 'pending' });
      await updateActorProfile(user.id, {
        registration_completed_at: new Date().toISOString(),
      });
      await refreshProfile();
      Alert.alert(t('common.success'), t('access.pendingBody'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.progress}>
        {t('access.progress', { done })}
      </Text>
      <Text style={styles.hint}>{t('access.submitHint')}</Text>

      <Pressable
        onPress={() => router.push('/(auth)/registration-form')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <Text style={styles.title}>{t('access.needsFormTitle')}</Text>
          <Text style={formOk ? styles.tick : styles.pending}>{formOk ? '✓' : '—'}</Text>
        </View>
        <Text style={styles.body}>{t('access.needsFormBody')}</Text>
        <Text style={styles.link}>
          {formOk ? t('profile.editRegistration') : t('access.fillForm')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(actor)/media')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <Text style={styles.title}>{t('access.needsMediaTitle')}</Text>
          <Text style={mediaOk ? styles.tick : styles.pending}>{mediaOk ? '✓' : '—'}</Text>
        </View>
        <Text style={styles.body}>{t('access.needsMediaBody')}</Text>
        <Text style={styles.link}>
          {mediaOk ? t('profile.editMedia') : t('access.uploadMedia')}
        </Text>
      </Pressable>

      <Button
        label={t('regForm.submit')}
        onPress={() => void onSubmit()}
        loading={sending}
        disabled={!canSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg, gap: Spacing.sm },
  progress: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.ink,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.92 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.ink,
  },
  tick: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.success,
  },
  pending: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.textMuted,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.goldDeep,
    fontSize: 14,
  },
});
