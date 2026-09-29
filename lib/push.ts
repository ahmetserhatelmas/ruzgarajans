import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import i18n from '@/lib/i18n';
import { Notifications } from '@/lib/notifications';

export type PushPermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function getPushPermissionState(): Promise<PushPermissionState> {
  if (!Notifications || Platform.OS === 'web' || !Device.isDevice) return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerAndSavePushToken(userId: string) {
  if (!Notifications || Platform.OS === 'web' || !Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('casts', {
      name: 'Cast ilanları',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('options', {
      name: 'Opsiyon',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('introductions', {
      name: 'Tanıtım',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!token) return;

  const locale = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
  await supabase
    .from('profiles')
    .update({ expo_push_token: token, locale })
    .eq('id', userId);
}

export async function enablePushFromSettings(userId: string): Promise<PushPermissionState> {
  const current = await getPushPermissionState();
  if (current === 'unavailable') return current;
  if (current === 'denied') {
    await Linking.openSettings();
    return current;
  }
  await registerAndSavePushToken(userId);
  return getPushPermissionState();
}
