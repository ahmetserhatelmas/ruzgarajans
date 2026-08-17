import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { IntroVideoCard } from '@/components/video/IntroVideoCard';
import { useAuth } from '@/contexts/AuthContext';
import { clearIntroVideo } from '@/services/videos';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, actorProfile, user, refreshProfile } = useAuth();
  const router = useRouter();
  const hasIntro = !!actorProfile?.intro_video_playback_url;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatar = Boolean(profile?.avatar_url) && !avatarFailed;

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.avatar_url]);

  return (
    <Screen scroll>
      <View style={styles.cover}>
        {profile?.cover_url ? (
          <Image source={{ uri: profile.cover_url }} style={StyleSheet.absoluteFill} />
        ) : null}
      </View>
      <View style={styles.avatarWrap}>
        {showAvatar ? (
          <Image
            source={{ uri: profile!.avatar_url! }}
            style={styles.avatar}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.initials}>
              {(profile?.full_name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.name}>{profile?.full_name}</Text>
      <Text style={styles.city}>{actorProfile?.city ?? '—'}</Text>

      {!hasIntro ? (
        <Button
          label={t('home.introCta')}
          onPress={() => router.push('/record/intro')}
          style={{ marginTop: Spacing.md }}
        />
      ) : null}
      <Button
        label={t('profile.edit')}
        variant="secondary"
        onPress={() => router.push('/(actor)/profile/edit')}
        style={{ marginTop: Spacing.sm }}
      />
      <Button
        label={t('profile.editRegistration')}
        variant="ghost"
        onPress={() => router.push('/(auth)/registration-form')}
        style={{ marginTop: Spacing.xs }}
      />
      <Button
        label={t('profile.editMedia')}
        variant="ghost"
        onPress={() => router.push('/(actor)/media')}
        style={{ marginTop: Spacing.xs }}
      />

      <Section title={t('profile.physical')}>
        <Row label={t('profile.height')} value={actorProfile?.height_cm?.toString()} />
        <Row label={t('profile.weight')} value={actorProfile?.weight_kg?.toString()} />
        <Row label={t('profile.hair')} value={actorProfile?.hair_color} />
        <Row label={t('profile.eyes')} value={actorProfile?.eye_color} />
        <Row label={t('profile.shoe')} value={actorProfile?.shoe_size} />
        <Row label={t('profile.body')} value={actorProfile?.body_size} />
      </Section>

      <Section title={t('profile.bio')}>
        <Text style={styles.block}>{actorProfile?.bio || '—'}</Text>
      </Section>

      <Section title={t('profile.experience')}>
        <Text style={styles.block}>{actorProfile?.experience || '—'}</Text>
      </Section>

      <Section title={t('profile.skills')}>
        <Text style={styles.block}>{(actorProfile?.skills ?? []).join(', ') || '—'}</Text>
      </Section>

      <Section title={t('profile.introVideo')}>
        <IntroVideoCard
          playbackUrl={actorProfile?.intro_video_playback_url}
          videoId={actorProfile?.intro_video_id}
          title={t('profile.introVideo')}
          canManage
          onChange={() => router.push('/record/intro')}
          onDelete={async () => {
            if (!user) return;
            await clearIntroVideo(user.id);
            await refreshProfile();
          }}
        />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 140,
    marginHorizontal: -Spacing.lg,
    backgroundColor: Colors.inkSoft,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarWrap: { marginTop: -40, marginBottom: Spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.paper,
    backgroundColor: Colors.paperMuted,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.ink,
  },
  name: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
  },
  city: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  section: { marginTop: Spacing.xl, gap: Spacing.sm },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontFamily: Fonts.body, color: Colors.textMuted },
  rowValue: { fontFamily: Fonts.bodyMedium, color: Colors.text },
  block: {
    fontFamily: Fonts.body,
    color: Colors.text,
    lineHeight: 22,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
