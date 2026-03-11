// Every page that called useUser() before now gets the real user ID for free.

import { useAuth } from "./useAuth";

export function useUser() {
  const { user, loading } = useAuth();
  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    loading,
  };
}
