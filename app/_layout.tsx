import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationObserver } from '@/components/NotificationObserver';
import { initI18n } from '@/lib/i18n';
import { lockInterfaceOrientation, useInterfaceOrientationLock } from '@/lib/appOrientation';
import { Colors } from '@/constants/theme';

void lockInterfaceOrientation();

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useInterfaceOrientationLock();
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync();
      void lockInterfaceOrientation();
    }
  }, [fontsLoaded, i18nReady]);

  if (!fontsLoaded || !i18nReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper }}>
        <ActivityIndicator color={Colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <NotificationObserver />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.paper },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(actor)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="record/intro" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="record/[kind]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="record/audition" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
