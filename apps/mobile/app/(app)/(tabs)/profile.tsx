import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/src/components/screen";
import { useAuth } from "@/src/lib/auth";
import { statsApi, type ProfileSummary } from "@/src/lib/api";
import { clearProfile } from "@/src/lib/storage";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

export default function ProfileScreen() {
  const { userId, email } = useUser();
  const { refreshProfileState } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    statsApi
      .getSummary(userId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleSignOut() {
    await clearProfile(userId);
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  async function handleResetOnboarding() {
    await clearProfile(userId);
    await refreshProfileState();
    router.replace("/onboarding");
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.subtitle}>{email}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.total_videos ?? 0}</Text>
          <Text style={styles.statLabel}>Saved videos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.processed_videos ?? 0}</Text>
          <Text style={styles.statLabel}>Processed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{summary?.weeks_active ?? 1}</Text>
          <Text style={styles.statLabel}>Weeks active</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Top theme</Text>
        <Text style={styles.cardBody}>
          {summary?.top_theme ? summary.top_theme.label : "No processed themes yet."}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/(app)/insights")}>
          <Text style={styles.secondaryButtonText}>Open insights</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <Pressable style={styles.secondaryButton} onPress={handleResetOnboarding}>
          <Text style={styles.secondaryButtonText}>Re-run onboarding</Text>
        </Pressable>
        <Pressable style={styles.dangerButton} onPress={handleSignOut}>
          <Text style={styles.dangerButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  statValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
