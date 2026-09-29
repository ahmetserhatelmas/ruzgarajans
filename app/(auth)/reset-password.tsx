import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { localizedError } from '@/lib/authErrors';
import { completePasswordReset } from '@/lib/emailOtp';
import { clearPendingReset, getPendingReset, type PendingReset } from '@/lib/pendingAuth';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [pending, setPending] = useState<PendingReset | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const row = await getPendingReset();
      if (!active) return;
      if (!row) {
        Alert.alert(t('common.error'), t('auth.codeExpired'));
        router.replace('/(auth)/forgot-password');
        return;
      }
      setPending(row);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [router, t]);

  const onSubmit = async () => {
    const email = (pending?.email || params.email || '').trim().toLowerCase();
    if (!pending?.resetToken || !email) {
      Alert.alert(t('common.error'), t('auth.codeExpired'));
      router.replace('/(auth)/forgot-password');
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert(t('common.error'), t('auth.weakPassword'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('common.error'), t('auth.passwordsMismatch'));
      return;
    }
    try {
      setLoading(true);
      await completePasswordReset({
        email,
        resetToken: pending.resetToken,
        password,
      });
      await clearPendingReset();
      Alert.alert(t('common.success'), t('auth.resetSuccess'));
      router.replace('/(auth)/login');
    } catch (e: unknown) {
      Alert.alert(t('common.error'), localizedError(t, e, 'auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <Screen>
        <LinearGradient />
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.brand} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <LinearGradient />
      <View style={styles.hero}>
        <Text style={styles.title}>{t('auth.resetPassword')}</Text>
      </View>
      <View style={styles.form}>
        <TextField
          label={t('auth.newPassword')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextField
          label={t('auth.confirmPassword')}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
        <Button label={t('auth.resetPassword')} onPress={() => void onSubmit()} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: Spacing.xl, gap: Spacing.sm },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.text,
  },
  form: { marginTop: Spacing.xl, gap: Spacing.md },
});
