import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import * as Device from 'expo-device';
import * as ScreenOrientation from 'expo-screen-orientation';

export function isTabletDevice() {
  if (Platform.OS === 'ios') return Platform.isPad === true;
  return Device.deviceType === Device.DeviceType.TABLET;
}

export function isRecordingPath(pathname: string | null | undefined) {
  return typeof pathname === 'string' && pathname.includes('/record');
}

export async function lockInterfaceOrientation() {
  try {
    if (isTabletDevice()) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
      return;
    }
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch {
    // native lock unavailable
  }
}

export async function unlockRecordingOrientation() {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
  } catch {
    // keep current lock
  }
}

/** Keep phones portrait except while a record screen is open. */
export function useInterfaceOrientationLock() {
  const pathname = usePathname();
  const recording = isRecordingPath(pathname);

  useEffect(() => {
    if (isTabletDevice()) {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => {});
      return;
    }
    if (!recording) void lockInterfaceOrientation();
  }, [recording]);

  useEffect(() => {
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !isRecordingPath(pathname) && !isTabletDevice()) {
        void lockInterfaceOrientation();
      }
    });
    return () => app.remove();
  }, [pathname]);
}
