import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/src/components/screen";
import { useAuth } from "@/src/lib/auth";
import { statsApi, type ProfileSummary } from "@/src/lib/api";
import {
  clearProfile,
  getSchedulePreferences,
  saveSchedulePreferences,
  type SchedulePreferences,
} from "@/src/lib/storage";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const timeOptions = ["06:00", "08:00", "12:00", "18:00", "21:00"] as const;

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.optionChip, active && styles.optionChipActive]} onPress={onPress}>
      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { userId, email } = useUser();
  const { refreshProfileState } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [preferences, setPreferences] = useState<SchedulePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  async function handleSavePreferences() {
    if (!userId || !preferences) {
      return;
    }

    setSavingPreferences(true);
    setSaveMessage(null);

    try {
      await saveSchedulePreferences(userId, preferences);
      setSaveMessage("Generation preferences saved on this device.");
    } finally {
      setSavingPreferences(false);
    }
  }

  if (loading || !preferences) {
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
        <Text style={styles.sectionTitle}>Generation preferences</Text>
        <Text style={styles.cardBody}>
          Set how often you want new episodes and when they should be prepared. This is frontend-only for now and saves locally on your device.
        </Text>

        <View style={styles.preferenceBlock}>
          <Text style={styles.preferenceLabel}>Frequency</Text>
          <View style={styles.optionRow}>
            <OptionChip
              label="Daily"
              active={preferences.frequency === "daily"}
              onPress={() => {
                setPreferences((current) => current ? { ...current, frequency: "daily" } : current);
                setSaveMessage(null);
              }}
            />
            <OptionChip
              label="Weekly"
              active={preferences.frequency === "weekly"}
              onPress={() => {
                setPreferences((current) => current ? { ...current, frequency: "weekly" } : current);
                setSaveMessage(null);
              }}
            />
          </View>
        </View>

        <View style={styles.preferenceBlock}>
          <Text style={styles.preferenceLabel}>Preferred time</Text>
          <View style={styles.optionRow}>
            {timeOptions.map((time) => (
              <OptionChip
                key={time}
                label={time}
                active={preferences.timeOfDay === time}
                onPress={() => {
                  setPreferences((current) => current ? { ...current, timeOfDay: time } : current);
                  setSaveMessage(null);
                }}
              />
            ))}
          </View>
        </View>

        {preferences.frequency === "weekly" ? (
          <View style={styles.preferenceBlock}>
            <Text style={styles.preferenceLabel}>Weekly day</Text>
            <View style={styles.optionRow}>
              {days.map((day) => (
                <OptionChip
                  key={day}
                  label={day}
                  active={preferences.weeklyDay === day}
                  onPress={() => {
                    setPreferences((current) => current ? { ...current, weeklyDay: day } : current);
                    setSaveMessage(null);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.preferenceLabel}>Auto-generate episodes</Text>
            <Text style={styles.toggleBody}>Keep the schedule active without needing to tap Generate manually.</Text>
          </View>
          <Switch
            value={preferences.autoGenerate}
            onValueChange={(value) => {
              setPreferences((current) => current ? { ...current, autoGenerate: value } : current);
              setSaveMessage(null);
            }}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={preferences.autoGenerate ? colors.primary : "#fff"}
          />
        </View>

        {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}

        <Pressable
          style={[styles.primaryButton, savingPreferences && styles.buttonDisabled]}
          onPress={handleSavePreferences}
          disabled={savingPreferences}
        >
          {savingPreferences ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save preferences</Text>
          )}
        </Pressable>
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
  preferenceBlock: {
    gap: 8,
  },
  preferenceLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionChipText: {
    color: colors.muted,
    fontWeight: "600",
  },
  optionChipTextActive: {
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleBody: {
    color: colors.muted,
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
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
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
