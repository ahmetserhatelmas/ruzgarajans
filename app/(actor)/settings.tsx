import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { localizedError } from '@/lib/authErrors';
import { InboxBell } from '@/components/ui/InboxBell';
import { Screen } from '@/components/ui/Screen';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { appLang, setAppLanguage } from '@/lib/i18n';
import {
  enablePushFromSettings,
  getPushPermissionState,
  type PushPermissionState,
} from '@/lib/push';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const lang = appLang(i18n.language);
  const { user, signOut, deleteAccount, updateLocale } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushState, setPushState] = useState<PushPermissionState | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getPushPermissionState().then(setPushState);
    }, [])
  );

  const onEnablePush = async () => {
    if (!user) return;
    try {
      setPushBusy(true);
      const next = await enablePushFromSettings(user.id);
      setPushState(next);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setPushBusy(false);
    }
  };

  const changeLang = async (lng: 'tr' | 'en') => {
    await setAppLanguage(lng);
    await updateLocale(lng).catch(() => undefined);
  };

  const onLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert(t('common.error'), localizedError(t, e));
    } finally {
      setLoggingOut(false);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccountTitle'), t('settings.deleteAccountBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setDeleting(true);
              await deleteAccount();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert(t('common.error'), t('settings.deleteFailed'));
            } finally {
              setDeleting(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <InboxBell />
      </View>

      <Text style={styles.section}>{t('settings.language')}</Text>
      <View style={styles.row}>
        <LangChip active={lang === 'tr'} label="Türkçe" onPress={() => changeLang('tr')} />
        <LangChip active={lang === 'en'} label="English" onPress={() => changeLang('en')} />
      </View>

      <Text style={styles.section}>{t('settings.notifications')}</Text>
      <View style={[styles.pushCard, pushState === 'granted' && styles.pushCardOn]}>
        <View style={styles.pushIcon}>
          <Ionicons
            name={pushState === 'granted' ? 'notifications' : 'notifications-off-outline'}
            size={22}
            color={pushState === 'granted' ? Colors.brand : Colors.textMuted}
          />
        </View>
        <View style={styles.pushCopy}>
          <Text style={styles.pushTitle}>
            {pushState === 'granted' ? t('settings.notificationsOn') : t('settings.notifications')}
          </Text>
          <Text style={styles.pushBody}>
            {pushState === 'granted'
              ? t('settings.notificationsOnBody')
              : pushState === 'denied'
                ? t('settings.notificationsDeniedBody')
                : pushState === 'unavailable'
                  ? t('settings.notificationsUnavailable', {
                      defaultValue:
                        'Notifications are not available in this build. They work in the store app.',
                    })
                  : t('settings.notificationsOffBody')}
          </Text>
          {pushState && pushState !== 'granted' && pushState !== 'unavailable' ? (
            <Button
              label={
                pushState === 'denied'
                  ? t('settings.notificationsOpenSettings')
                  : t('settings.notificationsEnable')
              }
              onPress={() => void onEnablePush()}
              loading={pushBusy}
              style={styles.pushBtn}
            />
          ) : null}
        </View>
      </View>

      <Text style={styles.section}>{t('settings.support')}</Text>
      <WhatsAppButton />

      <Text style={styles.section}>{t('settings.account')}</Text>
      <Button
        label={t('common.logout')}
        variant="secondary"
        loading={loggingOut}
        disabled={deleting}
        onPress={() => void onLogout()}
      />
      <Button
        label={t('settings.deleteAccount')}
        variant="danger"
        loading={deleting}
        disabled={loggingOut}
        onPress={onDeleteAccount}
        style={styles.deleteBtn}
      />
    </Screen>
  );
}

function LangChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.displayBold,
    fontSize: 36,
    color: Colors.ink,
  },
  section: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  chipText: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
  chipTextActive: { color: Colors.textOnDark },
  pushCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  pushCardOn: {
    borderColor: Colors.brand,
  },
  pushIcon: { paddingTop: 2 },
  pushCopy: { flex: 1, gap: Spacing.sm },
  pushTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.ink,
  },
  pushBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  pushBtn: { alignSelf: 'flex-start', minHeight: 44 },
  deleteBtn: { marginTop: Spacing.sm },
});
