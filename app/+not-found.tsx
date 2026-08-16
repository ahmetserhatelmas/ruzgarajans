import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Bu ekran bulunamadı.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Ana sayfaya dön</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.paper,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 28,
    color: Colors.ink,
  },
  link: { marginTop: Spacing.md },
  linkText: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.goldDeep,
  },
});
