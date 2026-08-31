import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ActorProfile, Profile } from '@/types/database';
import { fetchGalleryPhotos, type GalleryPhoto } from '@/services/gallery';
import i18n from '@/lib/i18n';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  actorProfile: ActorProfile | null;
  galleryPhotos: GalleryPhoto[];
  loading: boolean;
  configured: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateLocale: (locale: 'tr' | 'en') => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actorProfile, setActorProfile] = useState<ActorProfile | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const [{ data: p }, { data: a }, photos] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('actor_profiles').select('*').eq('user_id', userId).maybeSingle(),
      fetchGalleryPhotos(userId).catch(() => [] as GalleryPhoto[]),
    ]);
    let nextProfile = (p as Profile) ?? null;
    const appLocale = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'tr';
    if (nextProfile && nextProfile.locale !== appLocale) {
      const { error } = await supabase
        .from('profiles')
        .update({ locale: appLocale })
        .eq('id', userId);
      if (!error) nextProfile = { ...nextProfile, locale: appLocale };
    }
    setProfile(nextProfile);
    setActorProfile((a as ActorProfile) ?? null);
    setGalleryPhotos(photos);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!isSupabaseConfigured) {
        if (mounted) setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next?.user) {
        await loadProfile(next.user.id);
      } else {
        setProfile(null);
        setActorProfile(null);
        setGalleryPhotos([]);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    if (data.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    }
  }, [loadProfile]);

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
    }) => {
      const { error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            phone: input.phone ?? '',
            role: 'actor',
          },
        },
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    // Clear UI state first, then revoke session (local always works offline)
    setSession(null);
    setProfile(null);
    setActorProfile(null);
    setGalleryPhotos([]);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }, []);

  const updateLocale = useCallback(
    async (locale: 'tr' | 'en') => {
      if (!session?.user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ locale })
        .eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
    },
    [refreshProfile, session?.user]
  );

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      actorProfile,
      galleryPhotos,
      loading,
      configured: isSupabaseConfigured,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      updateLocale,
    }),
    [
      session,
      profile,
      actorProfile,
      galleryPhotos,
      loading,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      updateLocale,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
