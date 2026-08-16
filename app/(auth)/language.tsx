import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from '@/components/ui/Atmosphere';
import { Screen } from '@/components/ui/Screen';
import { setAppLanguage } from '@/lib/i18n';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function LanguageScreen() {
  const router = useRouter();

  const choose = async (lng: 'tr' | 'en') => {
    await setAppLanguage(lng);
    // push so hardware/back can return to language pick if needed
    router.replace('/(auth)/login');
  };

  return (
    <Screen>
      <LinearGradient />
      <View style={styles.hero}>
        <Text style={styles.brand}>Rüzgâr Ajans</Text>
        {/* Always bilingual — don't depend on current locale */}
        <Text style={styles.title}>Dil seçin</Text>
        <Text style={styles.titleEn}>Choose language</Text>
        <Text style={styles.sub}>
          Uygulamayı hangi dilde kullanmak istersiniz?{'\n'}
          Which language would you like to use?
        </Text>
      </View>
      <View style={styles.choices}>
        <Pressable
          onPress={() => void choose('tr')}
          style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.choiceLabel}>Türkçe</Text>
            <Text style={styles.choiceSub}>Devam et →</Text>
          </View>
          <Text style={styles.choiceHint}>TR</Text>
        </Pressable>
        <Pressable
          onPress={() => void choose('en')}
          style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.choiceLabel}>English</Text>
            <Text style={styles.choiceSub}>Continue →</Text>
          </View>
          <Text style={styles.choiceHint}>EN</Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>
        Yanlış seçersen giriş ekranından değiştirebilirsin.{'\n'}
        You can change this again on the login screen.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  brand: {
    fontFamily: Fonts.displayBold,
    fontSize: 42,
    color: Colors.ink,
  },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  titleEn: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 18,
    color: Colors.textMuted,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  choices: {
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  choice: {
    backgroundColor: Colors.ink,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pressed: { opacity: 0.9 },
  choiceLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    color: Colors.textOnDark,
  },
  choiceSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.gold,
    marginTop: 4,
  },
  choiceHint: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.gold,
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    color: Colors.textMuted,
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 20,
    paddingBottom: Spacing.md,
  },
});
