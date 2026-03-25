import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { Screen } from "@/src/components/screen";
import { statsApi, type ProfileSummary } from "@/src/lib/api";
import { getStoredFirstName } from "@/src/lib/storage";
import { colors } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

function getGreeting(firstName?: string | null) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${time}, ${firstName}` : time;
}

export default function HomeScreen() {
  const { userId } = useUser();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      return;
    }

    getStoredFirstName(userId).then(setFirstName);

    statsApi
      .getSummary(userId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <LoadingScreen label="Loading your feed..." />;
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.greeting}>{getGreeting(firstName)}</Text>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.heroBody}>
          This is the first mobile landing pass for your home screen. The logic is wired to the real
          profile summary endpoint already, so we can now iterate on the design inside Expo.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your growth this week</Text>
        <Text style={styles.metric}>{summary?.total_videos ?? 0} saved videos</Text>
        <Text style={styles.cardBody}>
          {summary?.top_theme
            ? `Top theme: ${summary.top_theme.label}`
            : "Save your first few videos to start seeing themes here."}
        </Text>
        <Link href="/(app)/insights" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>See your insights</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Link href="/(app)/(tabs)/library" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open library</Text>
          </Pressable>
        </Link>
        <Link href="/(app)/(tabs)/chat" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Open chat</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    padding: 22,
    gap: 8,
  },
  greeting: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
  },
  date: {
    color: colors.muted,
    fontSize: 14,
  },
  heroBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  metric: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  cardBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
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
});
