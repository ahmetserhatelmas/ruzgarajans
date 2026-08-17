import { useCallback, useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { canSendAgencyMessages } from '@/lib/access';
import {
  fetchMessages,
  getOrCreateConversation,
  sendMessage,
} from '@/services/messages';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const canMessage = canSendAgencyMessages(profile);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user || !canMessage) {
      setConversationId(null);
      setMessages([]);
      return;
    }
    const conv = await getOrCreateConversation(user.id);
    setConversationId(conv.id);
    const msgs = await fetchMessages(conv.id);
    setMessages(msgs);
  }, [user, canMessage]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
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
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const onSend = async () => {
    if (!user || !conversationId || !body.trim() || !canMessage) return;
    try {
      setSending(true);
      const msg = await sendMessage({
        conversationId,
        senderId: user.id,
        body,
      });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setBody('');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>{t('messages.title')}</Text>
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
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>{t('messages.empty')}</Text>}
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id;
              return (
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.bubbleText, mine && { color: Colors.textOnDark }]}>
                    {item.body}
                  </Text>
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
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    color: Colors.ink,
    paddingHorizontal: Spacing.lg,
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
  bubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.ink,
  },
  theirs: {
    alignSelf: 'flex-start',
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
