import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** If set, selecting this id clears other selections (and vice versa). */
  exclusiveNoneId?: string;
  /** Single-select mode (for matching fields like height, hair). */
  multiple?: boolean;
  error?: string;
};

export function ChipSelect({
  options,
  selected,
  onChange,
  exclusiveNoneId,
  multiple = true,
  error,
}: Props) {
  const toggle = (id: string) => {
    if (!multiple) {
      onChange(selected.includes(id) ? [] : [id]);
      return;
    }
    if (exclusiveNoneId && id === exclusiveNoneId) {
      onChange(selected.includes(id) ? [] : [id]);
      return;
    }
    const base = exclusiveNoneId
      ? selected.filter((s) => s !== exclusiveNoneId)
      : selected;
    if (base.includes(id)) {
      onChange(base.filter((s) => s !== id));
    } else {
      onChange([...base, id]);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              onPress={() => toggle(opt.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  chipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.text,
  },
  chipTextActive: { color: Colors.textOnDark },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.danger,
  },
});
