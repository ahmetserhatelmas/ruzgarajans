import { useState } from 'react';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { setAppLanguage } from '@/lib/i18n';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { signOut, updateLocale } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const changeLang = async (lng: 'tr' | 'en') => {
    await setAppLanguage(lng);
    await updateLocale(lng).catch(() => undefined);
  };

  const onLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <Text style={styles.section}>{t('settings.language')}</Text>
      <View style={styles.row}>
        <LangChip active={i18n.language === 'tr'} label="Türkçe" onPress={() => changeLang('tr')} />
        <LangChip active={i18n.language === 'en'} label="English" onPress={() => changeLang('en')} />
      </View>

      <Text style={styles.section}>{t('settings.support')}</Text>
      <WhatsAppButton />

      <Text style={styles.section}>{t('settings.account')}</Text>
      <Button
        label={t('common.logout')}
        variant="secondary"
        loading={loggingOut}
        onPress={() => void onLogout()}
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
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.ink,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  section: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
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
});
