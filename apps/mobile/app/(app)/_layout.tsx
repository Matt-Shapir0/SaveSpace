import { Redirect, Stack } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";

export default function AppLayout() {
  const { loading, user, hasProfile } = useAuth();

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
