import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Expo Go on Android throws if expo-notifications is imported (SDK 53+). */
export function androidPushNeedsDevBuild() {
  if (Platform.OS !== 'android') return false;
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient'
  );
}

function loadNotifications() {
  if (Platform.OS === 'web' || androidPushNeedsDevBuild()) return null;
  try {
    // require so Expo Go Android can skip the module (static import throws on SDK 53+).
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

export const Notifications = loadNotifications();
