import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { dismissPushNudge, shouldShowPushNudge } from '@/lib/notificationNudge';
import { enablePushFromSettings } from '@/lib/push';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export function NotificationNudge() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    void shouldShowPushNudge().then(setVisible);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="notifications-outline" size={22} color={Colors.brand} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('home.pushNudgeTitle')}</Text>
        <Text style={styles.body}>{t('home.pushNudgeBody')}</Text>
        <View style={styles.actions}>
          <Button
            label={t('settings.notificationsEnable')}
            loading={busy}
            onPress={() => {
              if (!user) return;
              void (async () => {
                try {
                  setBusy(true);
                  const next = await enablePushFromSettings(user.id);
                  if (next === 'granted') {
                    await dismissPushNudge();
                    setVisible(false);
                    return;
                  }
                  await dismissPushNudge();
                  setVisible(false);
                } finally {
                  setBusy(false);
                }
              })();
            }}
            style={styles.btn}
          />
          <Button
            label={t('common.notNow')}
            variant="ghost"
            disabled={busy}
            onPress={() => {
              void dismissPushNudge().then(() => setVisible(false));
            }}
            style={styles.btn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  icon: { paddingTop: 2 },
  copy: { flex: 1, gap: Spacing.sm },
  title: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.ink,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  btn: { minHeight: 44 },
});
