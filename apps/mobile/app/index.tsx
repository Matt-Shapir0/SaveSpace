import { Redirect } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { useAuth } from "@/src/lib/auth";

export default function IndexScreen() {
  const { loading, user, hasProfile } = useAuth();

  if (loading) {
    return <LoadingScreen label="Checking your account..." />;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (!hasProfile) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
