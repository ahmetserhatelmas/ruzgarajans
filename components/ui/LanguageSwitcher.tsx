import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  /** Persist to profile if logged in */
  persistProfile?: boolean;
};

/**
 * Always shows both labels (Türkçe / English) so users who picked the wrong
 * language can switch without reading the surrounding UI.
 */
export function LanguageSwitcher({ persistProfile = false }: Props) {
  const { i18n } = useTranslation();
  const { session, updateLocale } = useAuth();

  const change = async (lng: 'tr' | 'en') => {
    await setAppLanguage(lng);
    if (persistProfile && session) {
      await updateLocale(lng).catch(() => undefined);
    }
  };

  return (
    <View style={styles.wrap} accessibilityRole="toolbar">
      <Text style={styles.hint}>Dil / Language</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => void change('tr')}
          style={[styles.chip, i18n.language === 'tr' && styles.chipActive]}
        >
          <Text style={[styles.chipText, i18n.language === 'tr' && styles.chipTextActive]}>
            Türkçe
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void change('en')}
          style={[styles.chip, i18n.language === 'en' && styles.chipActive]}
        >
          <Text style={[styles.chipText, i18n.language === 'en' && styles.chipTextActive]}>
            English
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
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
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  chipText: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  chipTextActive: { color: Colors.textOnDark },
});
