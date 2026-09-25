import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export function hrefFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  if (typeof rec.url === 'string' && rec.url.startsWith('/')) return rec.url;
  const castId = rec.castId ?? rec.cast_id;
  if (typeof castId === 'string' && castId.length > 8) {
    return `/(actor)/cast/${castId}`;
  }
  return null;
}

let pendingHref: string | null = null;

export function setPendingNotificationHref(href: string) {
  pendingHref = href;
}

export function peekPendingNotificationHref() {
  return pendingHref;
}

export function takePendingNotificationHref() {
  const href = pendingHref;
  pendingHref = null;
  if (href && Platform.OS !== 'web') {
    void Notifications.clearLastNotificationResponseAsync();
  }
  return href;
}

if (Platform.OS !== 'web') {
  try {
    const last = Notifications.getLastNotificationResponse();
    const href = last
      ? hrefFromNotificationData(last.notification.request.content.data)
      : null;
    if (href) pendingHref = href;
  } catch {
    // ignore
  }
}
