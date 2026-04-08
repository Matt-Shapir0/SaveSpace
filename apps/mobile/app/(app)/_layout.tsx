import { useEffect, useRef } from "react";
import { Redirect, Stack, router } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { useAuth } from "@/src/lib/auth";
import { getPendingSharedUrl } from "@/src/lib/storage";
import { colors } from "@/src/lib/theme";

export default function AppLayout() {
  const { loading, user, hasProfile } = useAuth();
  const hasCheckedPendingShareRef = useRef(false);

  useEffect(() => {
    if (loading || !user || !hasProfile || hasCheckedPendingShareRef.current) {
      return;
    }

    hasCheckedPendingShareRef.current = true;

    getPendingSharedUrl().then((pendingUrl) => {
      if (pendingUrl) {
        router.replace("/share");
      }
    });
  }, [hasProfile, loading, user]);

  if (loading) {
    return <LoadingScreen label="Loading your app..." />;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (!hasProfile) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="generation-preferences" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="podcast/[id]" />
    </Stack>
  );
}
