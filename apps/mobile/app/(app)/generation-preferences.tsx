import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Screen } from "@/src/components/screen";
import {
  getSchedulePreferences,
  saveSchedulePreferences,
  type SchedulePreferences,
} from "@/src/lib/storage";
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

export default function GenerationPreferencesScreen() {
  const { userId } = useUser();
  const [preferences, setPreferences] = useState<SchedulePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    getSchedulePreferences(userId)
      .then(setPreferences)
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleSave() {
    if (!userId || !preferences) {
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      await saveSchedulePreferences(userId, preferences);
      setSaveMessage("Saved on this device.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !preferences) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Generation Preferences</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Automation settings</Text>
        <Text style={styles.heroBody}>
          Choose how often episodes should be prepared and what time they should show up. This is still frontend-only for now.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Frequency</Text>
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Time of day</Text>
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
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Day of week</Text>
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

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.sectionTitle}>Auto-generate</Text>
            <Text style={styles.toggleBody}>
              Keep your schedule active without needing to trigger generation manually.
            </Text>
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
      </View>

      {saveMessage ? <Text style={styles.successText}>{saveMessage}</Text> : null}

      <Pressable
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Save changes</Text>
        )}
      </Pressable>
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
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },
  heroCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    padding: 18,
    gap: 6,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  heroBody: {
    color: colors.muted,
    lineHeight: 20,
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
    color: colors.text,
    fontSize: 16,
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
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleBody: {
    color: colors.muted,
    lineHeight: 19,
  },
  successText: {
    color: colors.success,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
