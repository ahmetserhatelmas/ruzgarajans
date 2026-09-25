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
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InboxBell } from '@/components/ui/InboxBell';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { canSendAgencyMessages } from '@/lib/access';
import {
  fetchMessages,
  getOrCreateConversation,
  mergeMessages,
  sendMessage,
} from '@/services/messages';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function MessagesScreen() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const canMessage = canSendAgencyMessages(profile);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!user || !canMessage) {
      setConversationId(null);
      setMessages([]);
      return;
    }
    const conv = await getOrCreateConversation(user.id);
    setConversationId(conv.id);
    const msgs = await fetchMessages(conv.id);
    setMessages((prev) => mergeMessages(prev, msgs));
  }, [user, canMessage]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const poll = setInterval(() => {
        void load();
      }, 4000);
      return () => clearInterval(poll);
    }, [load])
  );

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
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
  }, [conversationId]);

  useEffect(() => {
    if (!messages.length) return;
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const onSend = async () => {
    if (!user || !conversationId || !body.trim() || !canMessage) return;
    const text = body.trim();
    const temp: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      body: text,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setBody('');
    setMessages((prev) => mergeMessages(prev, [temp]));
    try {
      setSending(true);
      const msg = await sendMessage({
        conversationId,
        senderId: user.id,
        body: text,
      });
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
      <View style={styles.topRow}>
        <Text style={styles.title}>{t('messages.title')}</Text>
        <InboxBell />
      </View>
      <Text style={styles.hint}>{t('messages.agencyOnly')}</Text>
      {!canMessage ? (
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>{t('messages.lockedTitle')}</Text>
          <Text style={styles.lockedBody}>{t('messages.lockedBody')}</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={12}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('messages.empty')}</Text>}
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
              placeholder={t('messages.placeholder')}
              placeholderTextColor={Colors.textMuted}
              value={body}
              onChangeText={setBody}
              editable={!sending}
            />
            <Button label={t('messages.send')} onPress={onSend} loading={sending} style={styles.send} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    paddingRight: Spacing.sm,
  },
  hint: {
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  locked: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  lockedTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.ink,
  },
  lockedBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  list: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1 },
  empty: { fontFamily: Fonts.body, color: Colors.textMuted },
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
  mine: {
    backgroundColor: Colors.brand,
  },
  theirs: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
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
  send: { paddingHorizontal: Spacing.md, minHeight: 48 },
});
