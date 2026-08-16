import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { getActorAccessState, hasRequiredMedia } from '@/lib/access';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  compact?: boolean;
};

export function AccessGateCard({ compact }: Props) {
  const { t } = useTranslation();
  const { profile, actorProfile, galleryPhotos } = useAuth();
  const router = useRouter();
  const state = getActorAccessState(profile, actorProfile, galleryPhotos);

  if (state === 'ready' || state === 'rejected' || state === 'needs_media') return null;

  const title =
    state === 'needs_form'
      ? t('access.needsFormTitle')
      : t('access.pendingTitle');
  const body =
    state === 'needs_form'
      ? t('access.needsFormBody')
      : t('access.pendingBody');

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {state === 'needs_form' ? (
        <Button
          label={t('access.fillForm')}
          onPress={() => router.push('/(auth)/registration-form')}
        />
      ) : (
        <Pressable onPress={() => router.push('/(auth)/registration-form')}>
          <Text style={styles.link}>{t('profile.editRegistration')}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function MediaAccessCard({ compact }: Props) {
  const { t } = useTranslation();
  const { profile, actorProfile, galleryPhotos } = useAuth();
  const router = useRouter();

  if (hasRequiredMedia(profile, actorProfile, galleryPhotos)) return null;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title}>{t('access.needsMediaTitle')}</Text>
      <Text style={styles.body}>{t('access.needsMediaBody')}</Text>
      <Button
        label={t('access.uploadMedia')}
        onPress={() => router.push('/(actor)/media')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardCompact: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.ink,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.goldDeep,
    fontSize: 14,
  },
});
