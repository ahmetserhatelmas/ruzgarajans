import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { LANGUAGE_KEY } from '@/lib/i18n';
import { takePendingNotificationHref } from '@/lib/notificationRoute';
import { clearAllPendingAuth, getAuthResumeHref, type AuthResume } from '@/lib/pendingAuth';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { session, profile, loading, configured } = useAuth();
  const [langChecked, setLangChecked] = useState(false);
  const [hasLang, setHasLang] = useState(false);
  const [resumeHref, setResumeHref] = useState<AuthResume | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [lang, resume] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_KEY),
        getAuthResumeHref(),
      ]);
      if (!active) return;
      setHasLang(Boolean(lang));
      setResumeHref(resume);
      setLangChecked(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (session) void clearAllPendingAuth();
  }, [session]);

  if (loading || !langChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper }}>
        <ActivityIndicator color={Colors.brand} />
      </View>
    );
  }

  if (!hasLang) {
    return <Redirect href="/(auth)/language" />;
  }

  if (!configured) {
    return <Redirect href="/(auth)/setup" />;
  }

  if (!session) {
    if (resumeHref) return <Redirect href={resumeHref} />;
    return <Redirect href="/(auth)/login" />;
  }

  if (profile?.role === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  if (profile?.role === 'cast_director') {
    return <Redirect href="/(director)" />;
  }

  if (profile?.actor_status === 'rejected') {
    return <Redirect href="/(auth)/rejected" />;
  }

  // Actors enter the app even before form / approval; cast is gated inside.
  // If the app was opened from a listing notification, go there instead of home.
  const fromNotification = takePendingNotificationHref();
  return <Redirect href={(fromNotification as any) ?? '/(actor)'} />;
}
