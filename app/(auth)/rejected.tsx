import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function RejectedScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.box}>
        <Text style={styles.title}>{t('auth.rejectedTitle')}</Text>
        <Text style={styles.body}>{t('auth.rejectedBody')}</Text>
        <WhatsAppButton />
        <Button
          label={t('common.logout')}
          variant="ghost"
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.ink,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
});
