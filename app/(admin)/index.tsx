import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { setAppLanguage } from '@/lib/i18n';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { canAdmin, type AdminPerm } from '@/lib/adminAccess';

const LINKS: { href: string; key: AdminPerm }[] = [
  { href: '/(admin)/actors', key: 'actors' },
  { href: '/(admin)/casts', key: 'casts' },
  { href: '/(admin)/applications', key: 'applications' },
  { href: '/(admin)/messages', key: 'messages' },
  { href: '/(admin)/announcements', key: 'announcements' },
];

export default function AdminHome() {
  const { t, i18n } = useTranslation();
  const { signOut, profile, updateLocale } = useAuth();
  const router = useRouter();

  const changeLang = async (lng: 'tr' | 'en') => {
    await setAppLanguage(lng);
    await updateLocale(lng).catch(() => undefined);
  };

  return (
    <Screen scroll>
      <Text style={styles.brand}>{t('brand')}</Text>
      <Text style={styles.title}>{t('admin.title')}</Text>
      <Text style={styles.sub}>{profile?.email}</Text>

      <Text style={styles.section}>{t('settings.language')}</Text>
      <View style={styles.langRow}>
        <LangChip
          active={i18n.language === 'tr'}
          label="Türkçe"
          onPress={() => void changeLang('tr')}
        />
        <LangChip
          active={i18n.language === 'en'}
          label="English"
          onPress={() => void changeLang('en')}
        />
      </View>

      <View style={styles.grid}>
        {LINKS.filter((l) => canAdmin(profile, l.key)).map((l) => (
          <Pressable
            key={l.key}
            style={styles.card}
            onPress={() => router.push(l.href as any)}
          >
            <Text style={styles.cardLabel}>{t(`admin.${l.key}`)}</Text>
          </Pressable>
        ))}
      </View>

      {canAdmin(profile, 'casts') ? (
        <Button
          label={t('admin.newCast')}
          onPress={() => router.push('/(admin)/casts/new')}
          style={{ marginTop: Spacing.lg }}
        />
      ) : null}
      <Button
        label={t('common.logout')}
        variant="ghost"
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/login');
        }}
        style={{ marginTop: Spacing.sm }}
      />
    </Screen>
  );
}

function LangChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontFamily: Fonts.displayBold,
    fontSize: 40,
    color: Colors.ink,
    marginTop: Spacing.md,
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.text,
  },
  sub: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  section: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  langRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  chipText: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  chipTextActive: { color: Colors.textOnDark },
  grid: { gap: Spacing.sm },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.ink,
  },
});
