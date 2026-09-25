import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { BackHeader } from '@/components/ui/BackHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchActorInbox,
  getSeenInboxKeys,
  markInboxSeen,
  visibleInboxItems,
  type ActorInboxItem,
} from '@/services/inbox';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function InboxScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ActorInboxItem[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    try {
      const [rows, seen] = await Promise.all([
        fetchActorInbox(user.id),
        getSeenInboxKeys(user.id),
      ]);
      setItems(visibleInboxItems(rows, seen));
    } catch {
      setItems([]);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openItem = async (item: ActorInboxItem) => {
    if (user) await markInboxSeen(user.id, [item.key]);
    setItems((prev) => prev.filter((row) => row.key !== item.key || row.kind === 'option'));
    router.push({
      pathname: '/(actor)/cast/[id]',
      params: { id: item.castId, from: 'inbox' },
    });
  };

  return (
    <Screen scroll header={<BackHeader fallbackHref="/(actor)" title={t('inbox.title')} />}>
      {items.length === 0 ? (
        <Text style={styles.empty}>{t('inbox.empty')}</Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => void openItem(item)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
          >
            <View
              style={[
                styles.icon,
                item.kind === 'option' ? styles.iconOption : styles.iconIntro,
              ]}
            >
              <Ionicons
                name={item.kind === 'option' ? 'star-outline' : 'megaphone-outline'}
                size={20}
                color={Colors.textOnDark}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.kind}>
                {item.kind === 'option' ? t('inbox.optionTitle') : t('inbox.introTitle')}
              </Text>
              <Text style={styles.project} numberOfLines={2}>
                {item.kind === 'option'
                  ? t('inbox.optionBody', {
                      project: item.projectName || t('cast.project'),
                      role: item.roleName || t('cast.role'),
                    })
                  : t('inbox.introBody', {
                      project: item.projectName || t('cast.project'),
                      role: item.roleName || t('cast.role'),
                    })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: Spacing.lg,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOption: { backgroundColor: Colors.brand },
  iconIntro: { backgroundColor: Colors.brandDeep },
  copy: { flex: 1, gap: 4 },
  kind: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.ink,
  },
  project: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});
