import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { BackHeader } from '@/components/ui/BackHeader';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMessages, mergeMessages, sendMessage } from '@/services/messages';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function AdminConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const msgs = await fetchMessages(id);
    setMessages((prev) => mergeMessages(prev, msgs));
  }, [id]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`admin-messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg?.id) setMessages((prev) => mergeMessages(prev, [msg]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!messages.length) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const onSend = async () => {
    if (!user || !id || !body.trim()) return;
    const text = body.trim();
    const temp: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: id,
      sender_id: user.id,
      body: text,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setBody('');
    setMessages((prev) => mergeMessages(prev, [temp]));
    try {
      setSending(true);
      const msg = await sendMessage({ conversationId: id, senderId: user.id, body: text });
      setMessages((prev) => mergeMessages(prev.filter((m) => m.id !== temp.id), [msg]));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setBody(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <BackHeader fallbackHref="/(admin)/messages" />
      </View>
      <Text style={styles.title}>{t('admin.messages')}</Text>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            const when = new Date(item.created_at).toLocaleString(
              i18n.language?.toLowerCase().startsWith('en') ? 'en-GB' : 'tr-TR',
              { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            );
            return (
              <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirsWrap]}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, mine && { color: Colors.textOnDark }]}>
                    {item.body}
                  </Text>
                </View>
                <Text style={[styles.stamp, mine && styles.stampMine]}>{when}</Text>
              </View>
            );
          }}
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={body}
            onChangeText={setBody}
            placeholder={t('messages.placeholder')}
            placeholderTextColor={Colors.textMuted}
            editable={!sending}
          />
          <Button label={t('messages.send')} onPress={onSend} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.ink,
    paddingHorizontal: Spacing.lg,
  },
  list: { padding: Spacing.lg, flexGrow: 1 },
  bubbleWrap: { maxWidth: '80%', marginBottom: Spacing.sm },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  stamp: {
    marginTop: 4,
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
  stampMine: { textAlign: 'right' },
  bubble: {
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  mine: { backgroundColor: Colors.brand },
  theirs: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: { fontFamily: Fonts.body, color: Colors.text },
  composer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    fontFamily: Fonts.body,
    color: Colors.text,
  },
});
