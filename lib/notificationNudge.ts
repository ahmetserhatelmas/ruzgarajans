import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPushPermissionState } from '@/lib/push';

const DISMISS_KEY = 'ruzgar.pushNudge.dismissedAt';
const COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000;

export async function shouldShowPushNudge() {
  const state = await getPushPermissionState();
  if (state === 'granted' || state === 'unavailable') return false;
  const raw = await AsyncStorage.getItem(DISMISS_KEY);
  const dismissedAt = raw ? Number(raw) : 0;
  if (!dismissedAt) return true;
  return Date.now() - dismissedAt >= COOLDOWN_MS;
}

export async function dismissPushNudge() {
  await AsyncStorage.setItem(DISMISS_KEY, String(Date.now()));
}
