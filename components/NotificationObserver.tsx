import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { registerAndSavePushToken } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';

function openFromNotification(notification: Notifications.Notification) {
  const url = notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) {
    router.push(url as any);
  }
}

export function NotificationObserver() {
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (loading || !session?.user || profile?.role !== 'actor') return;
    void registerAndSavePushToken(session.user.id).catch(() => undefined);
  }, [loading, session?.user, profile?.role]);

  useEffect(() => {
    if (Platform.OS === 'web' || loading || !session) return;

    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      openFromNotification(last.notification);
      void Notifications.clearLastNotificationResponseAsync();
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response.notification);
    });
    return () => sub.remove();
  }, [loading, session]);

  useEffect(() => {
    if (loading || !session?.user || profile?.role !== 'actor') return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`cast-options-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cast_options',
          filter: `actor_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { cast_id?: string; status?: string } | null;
          if (!row?.cast_id || row.status !== 'pending') return;
          if (Platform.OS === 'web') return;
          const tr = !i18n.language?.toLowerCase().startsWith('en');
          void Notifications.scheduleNotificationAsync({
            content: {
              title: tr
                ? 'Sizi bu projeye opsiyonlamak istiyoruz'
                : 'We want to option you for this project',
              body: tr
                ? 'İlanı inceleyin. Uygun görüyor musunuz?'
                : 'Review the listing. Are you available?',
              subtitle: 'Rüzgar Oyunculuk',
              data: { castId: row.cast_id, url: `/(actor)/cast/${row.cast_id}` },
              sound: 'default',
            },
            trigger: null,
            identifier: `option-${row.cast_id}`,
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loading, session?.user, profile?.role]);

  return null;
}
