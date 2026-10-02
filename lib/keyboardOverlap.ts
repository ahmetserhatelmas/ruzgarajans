import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/**
 * Extra scroll/composer space when the IME covers the window.
 * adjustResize already shrinks the window; edge-to-edge Android does not.
 */
export function useKeyboardOverlapPad() {
  const [pad, setPad] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const show = Keyboard.addListener('keyboardWillShow', (event) =>
        setPad(event.endCoordinates.height)
      );
      const hide = Keyboard.addListener('keyboardWillHide', () => setPad(0));
      return () => {
        show.remove();
        hide.remove();
      };
    }

    if (Platform.OS !== 'android') return;

    let baseline = Dimensions.get('window').height;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      const now = Dimensions.get('window').height;
      const shrunk = baseline - now > 80;
      const keyboard = event.endCoordinates?.height ?? 0;
      setPad(shrunk ? 0 : keyboard);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      baseline = Dimensions.get('window').height;
      setPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return pad;
}
