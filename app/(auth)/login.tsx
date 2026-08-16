import { useState } from 'react';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      Alert.alert(t('common.error'), t('auth.login'));
      return;
    }
    try {
      setLoading(true);
      await signIn(cleanEmail, cleanPassword);
      router.replace('/');
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <LinearGradient />
      <View style={styles.hero}>
        <Text style={styles.brand}>{t('brand')}</Text>
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
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label={t('auth.password')}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textContentType="password"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />
        <Button label={t('auth.login')} onPress={() => void onSubmit()} loading={loading} />
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
  hero: { marginTop: Spacing.xxl, gap: Spacing.sm },
  brand: {
    fontFamily: Fonts.displayBold,
    fontSize: 48,
    color: Colors.ink,
  },
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
