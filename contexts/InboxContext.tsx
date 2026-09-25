import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchActorInbox,
  getSeenInboxKeys,
  subscribeInbox,
  visibleInboxItems,
} from '@/services/inbox';

type InboxContextValue = {
  count: number;
  refresh: () => Promise<void>;
};

const InboxContext = createContext<InboxContextValue | undefined>(undefined);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const [items, seen] = await Promise.all([
        fetchActorInbox(user.id),
        getSeenInboxKeys(user.id),
      ]);
      setCount(visibleInboxItems(items, seen).length);
    } catch {
      // ignore offline
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), 8000);
    const unsub = subscribeInbox(() => void refresh());
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [refresh]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) {
    return { count: 0, refresh: async () => undefined };
  }
  return ctx;
}
