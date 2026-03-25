import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { Screen } from "@/src/components/screen";
import { useAuth } from "@/src/lib/auth";
import { profilesApi, type UserPreferences } from "@/src/lib/api";
import { markProfileComplete } from "@/src/lib/storage";
import { colors } from "@/src/lib/theme";

const encouragementOptions = ["gentle", "balanced", "direct"] as const;

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OnboardingScreen() {
  const { user, refreshProfileState } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [goals, setGoals] = useState("");
  const [interests, setInterests] = useState("");
  const [encouragementStyle, setEncouragementStyle] = useState<(typeof encouragementOptions)[number]>("balanced");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!user || !firstName.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    const prefs: UserPreferences = {
      firstName: firstName.trim(),
      goals: splitList(goals),
      interests: splitList(interests),
      encouragementStyle,
    };

    try {
      await markProfileComplete(user.id, prefs);
      await profilesApi.save(user.id, prefs);
      await refreshProfileState();
      router.replace("/(app)/(tabs)");
    } catch (value: unknown) {
      const message = value instanceof Error ? value.message : "Could not save your profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Set up your space</Text>
        <Text style={styles.subtitle}>
          This is the mobile landing zone for the onboarding flow from the web app. We can flesh the
          visuals out next, but this will already save the same profile data.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>First name</Text>
        <TextInput
          placeholder="What should Echo call you?"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Goals</Text>
        <TextInput
          placeholder="Confidence, consistency, calm"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={goals}
          onChangeText={setGoals}
        />

        <Text style={styles.label}>Interests</Text>
        <TextInput
          placeholder="Mindfulness, habits, personal growth"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={interests}
          onChangeText={setInterests}
        />

        <Text style={styles.label}>Encouragement style</Text>
        <View style={styles.optionsRow}>
          {encouragementOptions.map((option) => (
            <Pressable
              key={option}
              style={[styles.option, encouragementStyle === option && styles.optionSelected]}
              onPress={() => setEncouragementStyle(option)}
            >
              <Text
                style={[styles.optionText, encouragementStyle === option && styles.optionTextSelected]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, (!firstName.trim() || saving) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!firstName.trim() || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  label: {
    color: colors.text,
    fontWeight: "600",
    marginTop: 4,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    color: colors.text,
    textTransform: "capitalize",
    fontWeight: "600",
  },
  optionTextSelected: {
    color: colors.primary,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
