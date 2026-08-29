import { Image, StyleSheet, View } from 'react-native';

const logo = require('@/assets/images/icon.png');

type Props = {
  size?: number;
};

/** Agency mark — bottom-right of recorded intro / audition videos. */
export function VideoLogoMark({ size = 52 }: Props) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size }]}>
      <Image source={logo} style={styles.logo} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 20,
    borderRadius: 10,
    overflow: 'hidden',
    opacity: 0.92,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
