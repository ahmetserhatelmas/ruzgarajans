import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { localizedError } from '@/lib/authErrors';
import { BrandMark } from '@/components/ui/BrandMark';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const revealFields = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 280);
  };

  const onSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!configured) {
      router.replace('/(auth)/setup');
      return;
    }
    if (!cleanEmail || !cleanPassword) {
      Alert.alert(t('common.error'), t('auth.login'));
      return;
    }
    try {
      setLoading(true);
      await signIn(cleanEmail, cleanPassword);
      router.replace('/');
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e, 'auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen ref={scrollRef} scroll>
      <LinearGradient />
      <View style={styles.hero}>
        <BrandMark />
        <Text style={styles.tagline}>{t('tagline')}</Text>
        <LanguageSwitcher />
      </View>
      <View style={styles.form}>
        <TextField
          label={t('auth.email')}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          keyboardType="email-address"
          textContentType="username"
          autoComplete="email"
          importantForAutofill="yes"
          value={email}
          onChangeText={setEmail}
          onFocus={revealFields}
        />
        <TextField
          label={t('auth.password')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textContentType="password"
          autoComplete="password"
          importantForAutofill="yes"
          value={password}
          onChangeText={setPassword}
          onFocus={revealFields}
        />
        <Button label={t('auth.login')} onPress={() => void onSubmit()} loading={loading} />
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable>
            <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text style={styles.link}>
              {t('auth.noAccount')} {t('auth.register')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: Spacing.xl, gap: Spacing.sm, alignItems: 'center' },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.textMuted,
    lineHeight: 24,
    maxWidth: 320,
  },
  form: { marginTop: Spacing.xxl, gap: Spacing.md },
  link: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontFamily: Fonts.bodyMedium,
    color: Colors.goldDeep,
    fontSize: 15,
  },
});
