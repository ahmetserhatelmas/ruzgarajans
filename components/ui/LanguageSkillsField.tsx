import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SelectField } from '@/components/ui/SelectField';
import { languageOptions, LANGUAGE_LEVELS, type LanguageSkill } from '@/constants/languages';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  label?: string;
  value: LanguageSkill[];
  onChange: (next: LanguageSkill[]) => void;
};

export function LanguageSkillsField({ label, value, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const langs = languageOptions(i18n.language);
  const levels = LANGUAGE_LEVELS.map((id) => ({
    id,
    label: id === 'native' ? t('regForm.languageLevels.native') : id,
  }));

  const rows = value.length ? value : [{ code: '', level: '' }];

  const patch = (index: number, part: Partial<LanguageSkill>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...part } : row)));
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.fields}>
            <SelectField
              label={t('regForm.fields.language')}
              value={row.code}
              options={langs}
              onChange={(code) => patch(index, { code })}
              searchable
            />
            <SelectField
              label={t('regForm.fields.languageLevel')}
              value={row.level}
              options={levels}
              onChange={(level) => patch(index, { level })}
            />
          </View>
          {rows.length > 1 ? (
            <Pressable onPress={() => onChange(rows.filter((_, i) => i !== index))} hitSlop={8}>
              <Text style={styles.remove}>{t('regForm.removeLanguage')}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        onPress={() => onChange([...rows, { code: '', level: '' }])}
        style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
      >
        <Text style={styles.addText}>+ {t('regForm.addLanguage')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  row: { gap: Spacing.xs },
  fields: { gap: Spacing.sm },
  remove: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.danger,
    alignSelf: 'flex-end',
  },
  add: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPressed: { opacity: 0.85 },
  addText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.ink,
  },
});
