import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/authErrors';
import { EmailOtpError, requestEmailOtp, verifyEmailOtp, type OtpPurpose } from '@/lib/emailOtp';
import {
  clearPendingSignup,
  getPendingSignup,
  setPendingReset,
} from '@/lib/pendingAuth';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function VerifyCodeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ purpose?: string; email?: string }>();
  const purpose: OtpPurpose = params.purpose === 'reset' ? 'reset' : 'signup';
  const email = String(params.email ?? '').trim().toLowerCase();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendIn((n) => (n > 0 ? n - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onVerify = async () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) {
      Alert.alert(t('common.error'), t('auth.invalidCode'));
      return;
    }
    try {
      setLoading(true);
      const result = await verifyEmailOtp({ purpose, email, code: digits });
      if (purpose === 'signup') {
        if (result.accessToken && result.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: result.accessToken,
            refresh_token: result.refreshToken,
          });
          if (error) throw error;
        } else {
          const pending = getPendingSignup();
          if (!pending?.password) {
            Alert.alert(t('common.error'), t('auth.loginFailed'));
            router.replace('/(auth)/register');
            return;
          }
          await signIn(pending.email, pending.password);
        }
        clearPendingSignup();
        router.replace('/');
        return;
      }
      if (!result.resetToken) {
        Alert.alert(t('common.error'), t('auth.invalidCode'));
        return;
      }
      setPendingReset({ email, resetToken: result.resetToken });
      router.replace({
        pathname: '/(auth)/reset-password',
        params: { email },
      });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), localizedError(t, e, 'auth.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resendIn > 0) return;
    try {
      setLoading(true);
      const locale = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
      const pending = getPendingSignup();
      await requestEmailOtp({
        purpose,
        email,
        password: pending?.password,
        fullName: pending?.fullName,
        phone: pending?.phone,
        locale,
      });
      setResendIn(60);
      Alert.alert(t('common.success'), t('auth.codeSent'));
    } catch (e: unknown) {
      const wait = e instanceof EmailOtpError ? e.retryAfter : undefined;
      if (wait) setResendIn(wait);
      Alert.alert(t('common.error'), localizedError(t, e, 'auth.emailSendFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <LinearGradient />
      <View style={styles.hero}>
        <Text style={styles.title}>{t('auth.verifyTitle')}</Text>
        <Text style={styles.hint}>
          {t(purpose === 'signup' ? 'auth.verifySignupHint' : 'auth.verifyResetHint', { email })}
        </Text>
      </View>
      <View style={styles.form}>
        <TextField
          label={t('auth.code')}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
        />
        <Button label={t('common.continue')} onPress={() => void onVerify()} loading={loading} />
        <Button
          label={resendIn > 0 ? `${t('auth.resendCode')} (${resendIn})` : t('auth.resendCode')}
          variant="secondary"
          disabled={resendIn > 0}
          onPress={() => void onResend()}
        />
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
