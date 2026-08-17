import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { registerAndSavePushToken } from '@/lib/push';

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

  return null;
}
