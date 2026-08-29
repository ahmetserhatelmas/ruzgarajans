import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Fonts } from '@/constants/theme';
import { canAdmin } from '@/lib/adminAccess';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper }}>
        <ActivityIndicator color={Colors.brand} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile?.role === 'cast_director') {
    return <Redirect href="/(director)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.paper,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: { fontFamily: Fonts.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('admin.title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="actors/index"
        options={{
          href: canAdmin(profile, 'actors') ? undefined : null,
          title: t('admin.actors'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="casts/index"
        options={{
          href: canAdmin(profile, 'casts') ? undefined : null,
          title: t('admin.casts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="film-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="applications/index"
        options={{
          href: canAdmin(profile, 'applications') ? undefined : null,
          title: t('admin.applications'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          href: canAdmin(profile, 'messages') ? undefined : null,
          title: t('admin.messages'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="announcements/index" options={{ href: null }} />
      <Tabs.Screen name="casts/[id]" options={{ href: null }} />
      <Tabs.Screen name="casts/new" options={{ href: null }} />
      <Tabs.Screen name="actors/[id]" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
      <Tabs.Screen name="applications/[id]" options={{ href: null }} />
    </Tabs>
  );
}
