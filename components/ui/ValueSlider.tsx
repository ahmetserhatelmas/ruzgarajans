import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  error?: string;
};

export function ValueSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  error,
}: Props) {
  const display = value ?? Math.round((min + max) / 2);
  const hasValue = value != null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !hasValue && styles.valueMuted]}>
          {hasValue ? `${display}${unit ? ` ${unit}` : ''}` : '—'}
        </Text>
      </View>
      <View style={styles.trackCard}>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={display}
          onValueChange={(v) => onChange(Math.round(v))}
          minimumTrackTintColor={Colors.brand}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={Colors.brand}
        />
        <View style={styles.rangeRow}>
          <Text style={styles.rangeText}>
            {min}
            {unit ? ` ${unit}` : ''}
          </Text>
          <Text style={styles.rangeText}>
            {max}
            {unit ? ` ${unit}` : ''}
          </Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs, marginBottom: Spacing.md },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  value: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.text,
  },
  valueMuted: {
    color: Colors.textMuted,
  },
  trackCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  rangeText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.danger,
  },
});
