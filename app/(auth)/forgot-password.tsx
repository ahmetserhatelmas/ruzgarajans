import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { localizedError } from '@/lib/authErrors';
import { requestEmailOtp } from '@/lib/emailOtp';
import { setPendingOtp } from '@/lib/pendingAuth';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }
    try {
      setLoading(true);
      const locale = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
      await requestEmailOtp({ purpose: 'reset', email: cleanEmail, locale });
      await setPendingOtp({ email: cleanEmail, purpose: 'reset' });
      router.push({
        pathname: '/(auth)/verify-code',
        params: { purpose: 'reset', email: cleanEmail },
      });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), localizedError(t, e, 'auth.emailSendFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <LinearGradient />
      <View style={styles.hero}>
        <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
        <Text style={styles.hint}>{t('auth.forgotHint')}</Text>
      </View>
      <View style={styles.form}>
        <TextField
          label={t('auth.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Button label={t('auth.sendCode')} onPress={() => void onSubmit()} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: Spacing.xl, gap: Spacing.sm },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.text,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  form: { marginTop: Spacing.xl, gap: Spacing.md },
});
