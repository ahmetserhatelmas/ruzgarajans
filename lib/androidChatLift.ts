import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/** Labeled bottom tab, so the composer is not lifted by the whole keyboard. */
const TAB_BAR = 64;

/**
 * How far to push the chat composer above the Android keyboard.
 * If the window already shrank (adjustResize), return 0 so we don't double-offset.
 * Edge-to-edge Android does not shrink the window, so we lift by the overlap.
 */
export function useAndroidChatLift() {
  const [lift, setLift] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let baseline = Dimensions.get('window').height;

    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      const now = Dimensions.get('window').height;
      const shrunk = baseline - now > 80;
      const keyboard = event.endCoordinates?.height ?? 0;
      setLift(shrunk ? 0 : Math.max(0, keyboard - TAB_BAR));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      baseline = Dimensions.get('window').height;
      setLift(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return lift;
}
