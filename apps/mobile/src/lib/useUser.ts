import { useAuth } from "@/src/lib/auth";

export function useUser() {
  const { user, loading } = useAuth();

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    loading,
  };
}
