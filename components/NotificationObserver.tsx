import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { registerAndSavePushToken } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import {
  hrefFromNotificationData,
  setPendingNotificationHref,
} from '@/lib/notificationRoute';

function openFromNotification(notification: Notifications.Notification) {
  const href = hrefFromNotificationData(notification.request.content.data);
  if (!href) return;
  setPendingNotificationHref(href);
  router.push(href as any);
}

export function NotificationObserver() {
  const { loading, session, profile } = useAuth();

  useEffect(() => {
    if (loading || !session?.user || profile?.role !== 'actor') return;
    void registerAndSavePushToken(session.user.id).catch(() => undefined);
  }, [loading, session?.user, profile?.role]);

  useEffect(() => {
    if (Platform.OS === 'web' || loading || !session) return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotification(response.notification);
      void Notifications.clearLastNotificationResponseAsync();
    });
    return () => sub.remove();
  }, [loading, session]);

  useEffect(() => {
    if (loading || !session?.user || profile?.role !== 'actor') return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`cast-inbox-${userId}`)
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
                ? 'İlanı incelemenizi rica ederiz. Uygun görüyor musunuz?'
                : 'When you have a moment, could you review the listing?',
              subtitle: 'Rüzgar Oyunculuk',
              data: { castId: row.cast_id, url: `/(actor)/cast/${row.cast_id}` },
              sound: 'default',
            },
            trigger: null,
            identifier: `option-${row.cast_id}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cast_introductions',
          filter: `actor_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { cast_id?: string } | null;
          if (!row?.cast_id) return;
          if (Platform.OS === 'web') return;
          const tr = !i18n.language?.toLowerCase().startsWith('en');
          void Notifications.scheduleNotificationAsync({
            content: {
              title: tr ? 'Tanıtımınız yapıldı' : 'You were introduced',
              body: tr
                ? 'Ajans sizi bu rol için bir firmaya tanıttı. İlanı inceleyebilirsiniz.'
                : 'The agency introduced you for this role. You can review the listing.',
              subtitle: 'Rüzgar Oyunculuk',
              data: { castId: row.cast_id, url: `/(actor)/cast/${row.cast_id}` },
              sound: 'default',
            },
            trigger: null,
            identifier: `intro-${row.cast_id}`,
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
