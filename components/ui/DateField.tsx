import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type Props = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

const MIN_BIRTH = new Date(1920, 0, 1);
const DEFAULT_BIRTH = new Date(2000, 0, 1);

function parseISODate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder,
  error,
  maximumDate,
  minimumDate,
}: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_BIRTH);

  const parsed = useMemo(() => parseISODate(value), [value]);
  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US';
  const display = parsed
    ? parsed.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const min = minimumDate ?? MIN_BIRTH;
  const max = maximumDate ?? new Date();

  const openPicker = () => {
    setDraft(parsed ?? DEFAULT_BIRTH);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const commit = (date: Date) => {
    onChange(toISODate(date));
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'set' && date) commit(date);
      return;
    }
    if (date) setDraft(date);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
      >
        <Text style={[styles.barText, !display && styles.placeholder]}>
          {display || placeholder || t('common.select')}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          locale={locale}
          maximumDate={max}
          minimumDate={min}
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" />
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{label || t('common.select')}</Text>
                <Pressable
                  onPress={() => {
                    commit(draft);
                    close();
                  }}
                  hitSlop={12}
                >
                  <Text style={styles.done}>{t('common.done')}</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                locale={locale}
                maximumDate={max}
                minimumDate={min}
                onChange={onPickerChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}
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
  iosPicker: {
    alignSelf: 'stretch',
  },
});
