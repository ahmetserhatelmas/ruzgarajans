import { useState } from 'react';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { localizedError } from '@/lib/authErrors';
import { requestEmailOtp } from '@/lib/emailOtp';
import { setPendingSignup } from '@/lib/pendingAuth';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    if (cleanName.length < 2) {
      Alert.alert(t('common.error'), t('auth.invalidName'));
      return;
    }
    if (!cleanEmail.includes('@')) {
      Alert.alert(t('common.error'), t('auth.invalidEmail'));
      return;
    }
    if (password.trim().length < 6) {
      Alert.alert(t('common.error'), t('auth.weakPassword'));
      return;
    }
    try {
      setLoading(true);
      const locale = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
      await requestEmailOtp({
        purpose: 'signup',
        email: cleanEmail,
        password,
        fullName: cleanName,
        phone: phone.trim(),
        locale,
      });
      setPendingSignup({
        email: cleanEmail,
        password,
        fullName: cleanName,
        phone: phone.trim(),
      });
      router.push({
        pathname: '/(auth)/verify-code',
        params: { purpose: 'signup', email: cleanEmail },
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
        <Text style={styles.brand}>{t('brand')}</Text>
        <Text style={styles.title}>{t('auth.register')}</Text>
        <LanguageSwitcher />
      </View>
      <View style={styles.form}>
        <TextField label={t('auth.fullName')} value={fullName} onChangeText={setFullName} />
        <TextField
          label={t('auth.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label={t('auth.phone')}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextField
          label={t('auth.password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button label={t('auth.register')} onPress={() => void onSubmit()} loading={loading} />
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={styles.link}>
              {t('auth.hasAccount')} {t('auth.login')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: Spacing.xl, gap: Spacing.sm },
  brand: {
    fontFamily: Fonts.displayBold,
    fontSize: 40,
    color: Colors.ink,
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.text,
  },
  form: { marginTop: Spacing.xl, gap: Spacing.md },
  link: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.goldDeep,
    fontSize: 15,
  },
});
