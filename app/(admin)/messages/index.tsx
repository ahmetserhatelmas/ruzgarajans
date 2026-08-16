import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchConversationsAdmin } from '@/services/messages';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function AdminMessagesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchConversationsAdmin()
        .then(setItems)
        .catch(() => setItems([]));
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>{t('admin.messages')}</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View
            style={styles.card}
            onTouchEnd={() => router.push(`/(admin)/messages/${item.id}`)}
          >
            <Text style={styles.name}>
              {item.profiles?.full_name || item.actor_id.slice(0, 8)}
            </Text>
            <Text style={styles.email}>{item.profiles?.email}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('messages.empty')}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  list: { paddingHorizontal: Spacing.lg },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  name: { fontFamily: Fonts.bodyBold, color: Colors.ink },
  email: { fontFamily: Fonts.body, color: Colors.textMuted },
  empty: { fontFamily: Fonts.body, color: Colors.textMuted },
});
