import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
} from '@/services/announcements';
import type { Announcement } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

const emptyForm = {
  title_tr: '',
  title_en: '',
  body_tr: '',
  body_en: '',
};

export default function AdminAnnouncementsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    fetchAnnouncements()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (item: Announcement) => {
    setEditingId(item.id);
    setForm({
      title_tr: item.title_tr,
      title_en: item.title_en,
      body_tr: item.body_tr,
      body_en: item.body_en,
    });
  };

  const onSave = async () => {
    if (!user) return;
    if (!form.title_tr.trim() || !form.body_tr.trim()) {
      Alert.alert(t('common.error'), t('common.required'));
      return;
    }
    try {
      setLoading(true);
      const payload = {
        title_tr: form.title_tr.trim(),
        title_en: form.title_en.trim() || form.title_tr.trim(),
        body_tr: form.body_tr.trim(),
        body_en: form.body_en.trim() || form.body_tr.trim(),
      };
      if (editingId) {
        await updateAnnouncement(editingId, payload);
      } else {
        await createAnnouncement(payload, user.id);
      }
      resetForm();
      load();
      Alert.alert(t('common.success'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = (item: Announcement) => {
    Alert.alert(t('common.delete'), t('admin.deleteAnnouncementConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAnnouncement(item.id);
            if (editingId === item.id) resetForm();
            load();
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message ?? t('common.error'));
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <BackHeader fallbackHref="/(admin)" />
      <Text style={styles.title}>{t('admin.announcements')}</Text>

      <View style={styles.form}>
        <Text style={styles.formTitle}>
          {editingId ? t('common.edit') : t('admin.newAnnouncement')}
        </Text>
        <TextField
          label="Başlık (TR)"
          value={form.title_tr}
          onChangeText={(title_tr) => setForm((f) => ({ ...f, title_tr }))}
        />
        <TextField
          label="Title (EN)"
          value={form.title_en}
          onChangeText={(title_en) => setForm((f) => ({ ...f, title_en }))}
        />
        <TextField
          label="Metin (TR)"
          value={form.body_tr}
          onChangeText={(body_tr) => setForm((f) => ({ ...f, body_tr }))}
          multiline
        />
        <TextField
          label="Body (EN)"
          value={form.body_en}
          onChangeText={(body_en) => setForm((f) => ({ ...f, body_en }))}
          multiline
        />
        <Button
          label={editingId ? t('common.save') : t('admin.publish')}
          onPress={onSave}
          loading={loading}
        />
        {editingId ? (
          <Button label={t('common.cancel')} variant="ghost" onPress={resetForm} />
        ) : null}
      </View>

      <Text style={styles.section}>{t('admin.announcementList')}</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>{t('admin.noAnnouncements')}</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Pressable onPress={() => startEdit(item)}>
              <Text style={styles.cardTitle}>{item.title_tr}</Text>
              <Text style={styles.cardBody} numberOfLines={3}>
                {item.body_tr}
              </Text>
              <Text style={styles.cardMeta}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Button
                label={t('common.edit')}
                variant="secondary"
                onPress={() => startEdit(item)}
                style={styles.actionBtn}
              />
              <Button
                label={t('common.delete')}
                variant="danger"
                onPress={() => onDelete(item)}
                style={styles.actionBtn}
              />
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    marginVertical: Spacing.md,
  },
  form: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  formTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  section: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    color: Colors.ink,
    marginBottom: Spacing.md,
  },
  empty: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    color: Colors.ink,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  cardMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
