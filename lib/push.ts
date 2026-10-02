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
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannels() {
  if (!Notifications || Platform.OS !== 'android') return;
  const channels = [
    ['default', 'Rüzgar Oyunculuk'],
    ['casts', 'Cast ilanları'],
    ['options', 'Opsiyon'],
    ['introductions', 'Tanıtım'],
  ] as const;
  for (const [id, name] of channels) {
    await Notifications.setNotificationChannelAsync(id, {
      name,
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function registerAndSavePushToken(userId: string) {
  if (!Notifications || Platform.OS === 'web' || !Device.isDevice) return;

  await ensureAndroidChannels();

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

  let token: string | null = null;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return;
  }
  if (!token) return;

  const locale = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
  const { data: current } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .maybeSingle();
  const previous = current?.expo_push_token ?? null;

  const { error: rpcError } = await supabase.rpc('save_push_token', {
    p_token: token,
    p_platform: Platform.OS,
  });

  if (rpcError) {
    if (previous && previous !== token) {
      await supabase.from('expo_push_tokens').upsert(
        {
          token: previous,
          user_id: userId,
          platform: 'unknown',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
    }
    await supabase
      .from('profiles')
      .update({ expo_push_token: token, locale })
      .eq('id', userId);
    await supabase.from('expo_push_tokens').upsert(
      {
        token,
        user_id: userId,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
    return;
  }

  if (locale) {
    await supabase.from('profiles').update({ locale }).eq('id', userId);
  }
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
