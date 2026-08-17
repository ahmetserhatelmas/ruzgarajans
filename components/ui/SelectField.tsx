import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Option = { id: string; label: string };

type Props = {
  label?: string;
  value: string;
  options: Option[];
  onChange: (id: string) => void;
  placeholder?: string;
  error?: string;
};

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const selectedLabel = useMemo(() => {
    const hit = options.find((o) => o.id === value);
    return hit?.label ?? '';
  }, [options, value]);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
      >
        <Text style={[styles.barText, !selectedLabel && styles.placeholder]}>
          {selectedLabel || placeholder || t('common.select')}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{label || t('common.select')}</Text>
              <Pressable onPress={close} hitSlop={12}>
                <Text style={styles.done}>{t('common.skip')}</Text>
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: Spacing.lg }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.id === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.id);
                      close();
                    }}
                    style={[styles.row, active && styles.rowActive]}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  bar: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barPressed: { opacity: 0.9 },
  barText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.text,
  },
  placeholder: { color: Colors.textMuted },
  chevron: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.danger,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '55%',
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.md,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.ink,
  },
  done: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.goldDeep,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  row: {
    minHeight: 52,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  rowText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: Colors.text,
  },
  rowTextActive: {
    color: Colors.textOnDark,
  },
});
