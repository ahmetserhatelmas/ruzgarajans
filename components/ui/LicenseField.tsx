import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { LICENSE_CLASSES } from '@/constants/licenses';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
};

export function LicenseField({ selected, onChange, error }: Props) {
  const { t } = useTranslation();
  const extras = selected.filter(
    (id) => !LICENSE_CLASSES.includes(id as (typeof LICENSE_CLASSES)[number])
  );
  const options = [
    ...LICENSE_CLASSES.map((id) => ({ id, label: id })),
    ...extras.map((id) => ({ id, label: id })),
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('regForm.fields.drivingLicenses')}</Text>
      <ChipSelect options={options} selected={selected} onChange={onChange} error={error} />
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
});
