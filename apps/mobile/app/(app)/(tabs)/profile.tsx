import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Screen } from "@/src/components/screen";
import { useAuth } from "@/src/lib/auth";
import { statsApi, type ProfileSummary } from "@/src/lib/api";
import { clearProfile, getSchedulePreferences, type SchedulePreferences } from "@/src/lib/storage";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

function formatSchedule(preferences: SchedulePreferences | null) {
  if (!preferences) {
    return "Set your preferred generation schedule.";
  }

  if (preferences.frequency === "weekly") {
    return `${preferences.weeklyDay} at ${preferences.timeOfDay}`;
  }

  return `Daily at ${preferences.timeOfDay}`;
}

export default function ProfileScreen() {
  const { userId, email } = useUser();
  const { refreshProfileState } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [preferences, setPreferences] = useState<SchedulePreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    Promise.all([statsApi.getSummary(userId), getSchedulePreferences(userId)])
      .then(([nextSummary, nextPreferences]) => {
        setSummary(nextSummary);
        setPreferences(nextPreferences);
      })
      .catch(async () => {
        setSummary(null);
        setPreferences(await getSchedulePreferences(userId));
      })
      .finally(() => setLoading(false));
  }, [userId]);

  function handleSignOut() {
    Alert.alert("Sign out?", "You'll need to sign back in to access your account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await clearProfile(userId);
          await supabase.auth.signOut();
          router.replace("/auth");
        },
      },
    ]);
  }

  function handleResetOnboarding() {
    Alert.alert("Re-run onboarding?", "This will clear your saved preferences.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        style: "destructive",
        onPress: async () => {
          await clearProfile(userId);
          await refreshProfileState();
          router.replace("/onboarding");
        },
      },
    ]);
  }

  async function handleChangePassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Check your email", `We sent a password reset link to ${email}.`);
    }
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Your Profile</Text>
          <Text style={styles.subtitle}>{email}</Text>
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push("/(app)/generation-preferences")}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
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

      <Pressable
        style={styles.settingsCard}
        onPress={() => router.push("/(app)/generation-preferences")}
      >
        <View style={styles.settingsIconWrap}>
          <Ionicons name="settings-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.settingsCopy}>
          <Text style={styles.settingsTitle}>Generation preferences</Text>
          <Text style={styles.settingsBody}>{formatSchedule(preferences)}</Text>
          <Text style={styles.settingsMeta}>
            {preferences?.autoGenerate ? "Auto-generate is on" : "Auto-generate is off"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

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
        <Text style={styles.sectionTitle}>Account</Text>

        <Pressable style={styles.rowItem} onPress={handleChangePassword}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
          <Text style={styles.rowItemText}>Change password</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        <Pressable style={styles.rowItem} onPress={() => Alert.alert("Coming soon", "Notification preferences will be available in a future update.")}>
          <Ionicons name="notifications-outline" size={18} color={colors.muted} />
          <Text style={styles.rowItemText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        <Pressable style={styles.rowItem} onPress={handleResetOnboarding}>
          <Ionicons name="refresh-outline" size={18} color={colors.muted} />
          <Text style={styles.rowItemText}>Re-run onboarding</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
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
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
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
  settingsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
  },
  settingsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsCopy: {
    flex: 1,
    gap: 4,
  },
  settingsTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  settingsBody: {
    color: colors.text,
    fontSize: 14,
  },
  settingsMeta: {
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
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  rowItemText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
});
