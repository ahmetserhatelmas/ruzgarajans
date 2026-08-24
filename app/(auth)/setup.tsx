import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Colors, Fonts, Spacing } from '@/constants/theme';

export default function SetupScreen() {
  return (
    <Screen>
      <View style={styles.box}>
        <Text style={styles.brand}>Rüzgâr Oyunculuk</Text>
        <Text style={styles.title}>Supabase yapılandırması gerekli</Text>
        <Text style={styles.body}>
          Proje köküne `.env` dosyası ekleyin ve şu değerleri doldurun:
        </Text>
        <Text style={styles.code}>
          EXPO_PUBLIC_SUPABASE_URL=...{'\n'}
          EXPO_PUBLIC_SUPABASE_ANON_KEY=...{'\n'}
          EXPO_PUBLIC_WHATSAPP_URL=https://wa.me/...{'\n'}
          EXPO_PUBLIC_CF_CUSTOMER_SUBDOMAIN=customer-xxx.cloudflarestream.com
        </Text>
        <Text style={styles.body}>
          Ardından `supabase/migrations/001_initial.sql` dosyasını Supabase SQL Editor’da
          çalıştırın ve uygulamayı yeniden başlatın.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', gap: Spacing.md },
  brand: { fontFamily: Fonts.displayBold, fontSize: 40, color: Colors.ink },
  title: { fontFamily: Fonts.bodyBold, fontSize: 20, color: Colors.text },
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  code: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    backgroundColor: Colors.ink,
    color: Colors.gold,
    padding: Spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
