import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const logo = require('@/assets/images/icon.png');

export function BrandMark({ showName = true }: { showName?: boolean }) {
  return (
    <View style={styles.wrap}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      {showName ? <Text style={styles.name}>Rüzgâr Oyunculuk</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 28,
  },
  name: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.ink,
    textAlign: 'center',
  },
});
