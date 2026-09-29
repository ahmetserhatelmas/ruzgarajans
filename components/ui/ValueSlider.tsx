import React, { useEffect, useRef, useState } from 'react';
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

function snapToStep(value: number, min: number, max: number, step: number) {
  const snapped = Math.round((value - min) / step) * step + min;
  return Math.min(max, Math.max(min, snapped));
}

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
  const fallback = snapToStep((min + max) / 2, min, max, step);
  const committed = value ?? fallback;
  const sliding = useRef(false);
  const [thumb, setThumb] = useState(committed);
  const [shown, setShown] = useState(committed);
  const hasValue = value != null;

  useEffect(() => {
    if (sliding.current || value == null) return;
    setThumb(value);
    setShown(value);
  }, [value]);

  const commit = (raw: number) => {
    const next = snapToStep(raw, min, max, step);
    setThumb(next);
    setShown(next);
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !hasValue && !sliding.current && styles.valueMuted]}>
          {hasValue || sliding.current ? `${shown}${unit ? ` ${unit}` : ''}` : '—'}
        </Text>
      </View>
      <View style={styles.trackCard}>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          value={thumb}
          onSlidingStart={() => {
            sliding.current = true;
          }}
          onValueChange={(raw) => {
            if (!sliding.current) return;
            setThumb(raw);
            setShown(snapToStep(raw, min, max, step));
          }}
          onSlidingComplete={(raw) => {
            commit(raw);
            sliding.current = false;
          }}
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
