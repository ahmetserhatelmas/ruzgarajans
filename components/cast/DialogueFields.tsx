import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/ui/TextField';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  parseDialogueScript,
  stringifyDialogueScript,
  type DialogueVoice,
} from '@/lib/dialogueScript';

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export function DialogueFields({ value, onChange }: Props) {
  const { t } = useTranslation();
  const script = parseDialogueScript(value);
  const editable = script.lines
    .map((line) => `${line.speaker === 'actor' ? 'Oyuncu' : 'Yapay zeka'}: ${line.text}`)
    .join('\n');

  const patch = (voice?: DialogueVoice, rate?: number, text?: string) => {
    const next = parseDialogueScript(text ?? editable);
    next.voice = voice ?? script.voice;
    next.rate = rate ?? script.rate;
    next.gapSec = script.gapSec;
    onChange(stringifyDialogueScript(next));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{t('video.dialogueHint')}</Text>
      <Text style={styles.label}>{t('video.dialogueVoice')}</Text>
      <View style={styles.row}>
        {(['female', 'male'] as const).map((voice) => (
          <Pressable
            key={voice}
            onPress={() => patch(voice, script.rate)}
            style={[styles.chip, script.voice === voice && styles.chipOn]}
          >
            <Text style={[styles.chipText, script.voice === voice && styles.chipTextOn]}>
              {voice === 'female' ? 'Kadın' : 'Erkek'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>
        {t('video.dialogueRate')}: {script.rate.toFixed(2)}
      </Text>
      <Slider
        minimumValue={0.25}
        maximumValue={1.5}
        step={0.05}
        value={script.rate}
        onValueChange={(rate) => patch(script.voice, Number(rate.toFixed(2)))}
        minimumTrackTintColor={Colors.brand}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.brand}
      />
      <Text style={styles.hint}>0.25 yavaş · 1.00 normal · 1.50 hızlı</Text>
      <TextField
        label={t('video.dialogueScript')}
        value={editable}
        onChangeText={(text) => patch(script.voice, script.rate, text)}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm, marginVertical: Spacing.sm },
  hint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  label: { fontFamily: Fonts.bodyMedium, color: Colors.text, fontSize: 13 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipOn: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipText: { fontFamily: Fonts.bodyMedium, color: Colors.text },
  chipTextOn: { color: Colors.textOnDark },
});
