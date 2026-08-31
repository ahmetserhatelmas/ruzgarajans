import { Image, StyleSheet, View } from 'react-native';

const logo = require('@/assets/images/icon.png');

type Props = {
  size?: number;
};

/** Agency mark — bottom-right of recorded intro / audition videos. */
export function VideoLogoMark({ size = 56 }: Props) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { width: size, height: size }]}>
      <Image source={logo} style={styles.logo} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 14,
    bottom: 88,
    zIndex: 40,
    elevation: 8,
    borderRadius: 12,
    overflow: 'hidden',
    opacity: 0.94,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
