import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";

import { Screen } from "@/src/components/screen";
import { useAuth } from "@/src/lib/auth";
import { statsApi, type InsightsData, type ProfileSummary } from "@/src/lib/api";
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

function getRecentThemeLabel(
  evolutionData: InsightsData["evolution_data"] | undefined,
  weeks: number
) {
  if (!evolutionData?.length) {
    return null;
  }

  const recent = evolutionData.slice(-weeks);
  const counts = new Map<string, number>();

  recent.forEach((row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (key === "week" || typeof value !== "number") {
        return;
      }

      counts.set(key, (counts.get(key) ?? 0) + value);
    });
  });

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] ?? null;
}

function getWeeklyTotals(evolutionData: InsightsData["evolution_data"] | undefined) {
  if (!evolutionData?.length) {
    return [];
  }

  return evolutionData.map((row) => {
    const total = Object.entries(row).reduce((sum, [key, value]) => {
      if (key === "week" || typeof value !== "number") {
        return sum;
      }

      return sum + value;
    }, 0);

    return {
      week: String(row.week ?? ""),
      total,
    };
  });
}

function getFilledWeeklyTotals(evolutionData: InsightsData["evolution_data"] | undefined, target = 6) {
  const actual = getWeeklyTotals(evolutionData);

  if (actual.length >= target) {
    return actual.slice(-target).map((item) => ({ ...item, placeholder: false }));
  }

  const placeholders = Array.from({ length: target - actual.length }, (_, index) => ({
    week: `W${index + 1}`,
    total: 0,
    placeholder: true,
  }));

  return [...placeholders, ...actual.map((item) => ({ ...item, placeholder: false }))];
}

function getThemeBars(summary: ProfileSummary | null, insights: InsightsData | null) {
  if (summary?.theme_distribution?.length) {
    return summary.theme_distribution.slice(0, 5).map((item) => ({
      id: item.theme_id,
      label: item.label,
      color: item.color,
      value: item.percentage,
    }));
  }

  if (insights?.distribution?.length) {
    return insights.distribution.slice(0, 5).map((item) => ({
      id: item.theme_id,
      label: item.name,
      color: item.color,
      value: item.value,
    }));
  }

  return [];
}

function buildDonutChartUri(
  slices: Array<{ color: string; value: number }>,
  size = 160,
  strokeWidth = 30
) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const circles = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const dash = (slice.value / 100) * circumference;
      const circle = `
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="${slice.color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${dash} ${circumference - dash}"
          stroke-dashoffset="${-offset}"
          stroke-linecap="butt"
        />
      `;
      offset += dash;
      return circle;
    })
    .join("");

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-90 ${size / 2} ${size / 2})">
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="${colors.surface}"
          stroke-width="${strokeWidth}"
        />
        ${circles}
      </g>
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius - strokeWidth / 2}" fill="${colors.card}" />
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function ProfileScreen() {
  const { userId, email } = useUser();
  const { refreshProfileState } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [preferences, setPreferences] = useState<SchedulePreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    Promise.all([
      statsApi.getSummary(userId),
      statsApi.getInsights(userId).catch(() => null),
      getSchedulePreferences(userId),
    ])
      .then(([nextSummary, nextInsights, nextPreferences]) => {
        setSummary(nextSummary);
        setInsights(nextInsights);
        setPreferences(nextPreferences);
      })
      .catch(async () => {
        setSummary(null);
        setInsights(null);
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
  const recentWeekTheme = useMemo(
    () => getRecentThemeLabel(insights?.evolution_data, 1) ?? summary?.top_theme?.label ?? null,
    [insights?.evolution_data, summary?.top_theme?.label]
  );
  const recentMonthTheme = useMemo(
    () => getRecentThemeLabel(insights?.evolution_data, 4) ?? summary?.top_theme?.label ?? null,
    [insights?.evolution_data, summary?.top_theme?.label]
  );
  const weeklyTotals = useMemo(() => getFilledWeeklyTotals(insights?.evolution_data), [insights?.evolution_data]);
  const maxWeeklyTotal = Math.max(...weeklyTotals.map((item) => item.total), 1);
  const themeBars = useMemo(() => getThemeBars(summary, insights), [summary, insights]);
  const donutChartUri = useMemo(
    () => buildDonutChartUri(themeBars.map((item) => ({ color: item.color, value: item.value }))),
    [themeBars]
  );

  async function handleSignOut() {
    await clearProfile(userId);
    await supabase.auth.signOut();
    router.replace("/auth");
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
          <Text style={styles.statValue}>{summary?.weeks_active ?? 1}</Text>
          <Text style={styles.statLabel}>Weeks active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{recentWeekTheme ?? "None yet"}</Text>
          <Text style={styles.statLabel}>Theme this week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{recentMonthTheme ?? "None yet"}</Text>
          <Text style={styles.statLabel}>Theme this month</Text>
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

      {weeklyTotals.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity trend</Text>
          <Text style={styles.cardBody}>A quick look at how much themed activity you had across recent weeks.</Text>
          <View style={styles.activityChart}>
            {weeklyTotals.map((item) => (
              <View key={item.week} style={styles.activityBarWrap}>
                <View
                  style={[
                    styles.activityBar,
                    item.placeholder && styles.activityBarPlaceholder,
                    {
                      height: `${item.placeholder ? 24 : Math.max(24, (item.total / maxWeeklyTotal) * 100)}%`,
                    },
                  ]}
                />
                <Text style={[styles.activityLabel, item.placeholder && styles.activityLabelPlaceholder]}>
                  {item.week}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {themeBars.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Theme distribution</Text>
          <Text style={styles.cardBody}>Your most common themes across processed content.</Text>
          <View style={styles.pieChartRow}>
            <ExpoImage source={{ uri: donutChartUri }} style={styles.pieChartImage} contentFit="contain" />
            <View style={styles.pieLegend}>
              {themeBars.map((item) => (
                <View key={item.id} style={styles.pieLegendRow}>
                  <View style={styles.pieLegendLabelWrap}>
                    <View style={[styles.pieLegendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.pieLegendLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.pieLegendValue}>{item.value}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {insights?.has_data && insights.insights.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightStack}>
            {insights.insights.map((item, index) => (
              <View key={`${item.title}-${index}`} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>{item.title}</Text>
                  <Text style={styles.insightChange}>{item.change}</Text>
                </View>
                <Text style={styles.insightBody}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

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

        <Pressable style={styles.secondaryButton} onPress={() => router.push("/(app)/insights")}>
          <Text style={styles.secondaryButtonText}>Open full insights</Text>
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
    gap: 6,
  },
  statValue: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
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
  activityChart: {
    height: 152,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 8,
  },
  activityBarWrap: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  activityBar: {
    width: "100%",
    maxWidth: 24,
    minHeight: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  activityBarPlaceholder: {
    backgroundColor: colors.border,
  },
  activityLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  activityLabelPlaceholder: {
    color: `${colors.muted}88`,
  },
  pieChartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  pieChartImage: {
    width: 140,
    height: 140,
  },
  pieLegend: {
    flex: 1,
    gap: 10,
  },
  pieLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pieLegendLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieLegendLabel: {
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },
  pieLegendValue: {
    color: colors.muted,
    fontWeight: "700",
  },
  insightStack: {
    gap: 10,
  },
  insightCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  insightTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  insightChange: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  insightBody: {
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
