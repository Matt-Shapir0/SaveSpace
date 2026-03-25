import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { profilesApi } from "@/src/lib/api";
import { getHasProfile, markExistingProfile } from "@/src/lib/storage";
import { supabase } from "@/src/lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasProfile: boolean | null;
  refreshProfileState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const loadProfileState = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setHasProfile(null);
      return;
    }

    try {
      const hasLocalProfile = await getHasProfile(nextUser.id);

      if (hasLocalProfile) {
        setHasProfile(true);
        return;
      }

      const profile = await profilesApi.get(nextUser.id);
      await markExistingProfile(nextUser.id, profile?.first_name ?? null);
      setHasProfile(true);
    } catch {
      setHasProfile(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session: nextSession } }) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await loadProfileState(nextSession?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await loadProfileState(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      hasProfile,
      refreshProfileState: async () => {
        await loadProfileState(user);
      },
    }),
    [hasProfile, loadProfileState, loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
