import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { Screen } from "@/src/components/screen";
import { episodesApi, statsApi, type EpisodeSummary, type ProfileSummary } from "@/src/lib/api";
import { getStoredFirstName } from "@/src/lib/storage";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

function getGreeting(firstName?: string | null) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${time}, ${firstName}` : time;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function ThemePill({ themeId }: { themeId: string }) {
  const theme = themeColors[themeId as ThemeId];

  if (!theme) {
    return null;
  }

  return (
    <View style={[styles.themePill, { borderColor: theme.color }]}>
      <Text style={[styles.themePillText, { color: theme.color }]}>
        {theme.icon} {theme.name}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { userId } = useUser();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) {
      return;
    }

    const [nextFirstName, nextSummary, nextEpisodes] = await Promise.all([
      getStoredFirstName(userId),
      statsApi.getSummary(userId).catch(() => null),
      episodesApi.listByUser(userId).catch(() => []),
    ]);

    setFirstName(nextFirstName);
    setSummary(nextSummary);
    setEpisodes(nextEpisodes);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
        loadData();
      },
      [loadData]
    )
  );

  if (loading) {
    return <LoadingScreen label="Loading your feed..." />;
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const featuredEpisode = episodes.find((episode) => episode.status === "done") ?? null;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.greeting}>{getGreeting(firstName)}</Text>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.heroBody}>
          Your source library is growing into personalized episodes. Here’s what’s moving this week.
        </Text>
      </View>

      {featuredEpisode ? (
        <View style={styles.featuredCard}>
          <Text style={styles.featuredLabel}>Featured Episode</Text>
          <Text style={styles.featuredTitle}>{featuredEpisode.title}</Text>
          <Text style={styles.featuredMeta}>
            {formatShortDate(featuredEpisode.created_at)}
            {formatDuration(featuredEpisode.audio_duration)
              ? ` · ${formatDuration(featuredEpisode.audio_duration)}`
              : ""}
          </Text>
          <View style={styles.themeRow}>
            {(featuredEpisode.themes ?? []).slice(0, 2).map((themeId) => (
              <ThemePill key={themeId} themeId={themeId} />
            ))}
          </View>
          <Link href={`/(app)/podcast/${featuredEpisode.id}`} asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Play Featured Episode</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Featured Episode</Text>
          <Text style={styles.cardBody}>
            Once you generate an episode, this area can spotlight today’s best listen.
          </Text>
          <Link href="/(app)/(tabs)/library" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open Library</Text>
            </Pressable>
          </Link>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your growth this week</Text>
        <Text style={styles.metric}>{summary?.total_videos ?? 0} saved posts</Text>
        <Text style={styles.cardBody}>
          {summary?.top_theme
            ? `Top theme: ${summary.top_theme.label}`
            : "Save a few posts to start seeing your strongest themes."}
        </Text>
        <Link href="/(app)/insights" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>See your insights</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricCardValue}>{summary?.processed_videos ?? 0}</Text>
          <Text style={styles.metricCardLabel}>Processed</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricCardValue}>{episodes.filter((episode) => episode.status === "done").length}</Text>
          <Text style={styles.metricCardLabel}>Episodes ready</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primarySoft, borderRadius: 28, padding: 22, gap: 8 },
  greeting: { fontSize: 30, fontWeight: "700", color: colors.text },
  date: { color: colors.muted, fontSize: 14 },
  heroBody: { color: colors.text, fontSize: 15, lineHeight: 22 },
  featuredCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 18, gap: 10 },
  featuredLabel: { color: colors.primary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  featuredTitle: { color: colors.text, fontSize: 22, fontWeight: "700" },
  featuredMeta: { color: colors.muted, fontSize: 13 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#fff" },
  themePillText: { fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 18, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  metric: { fontSize: 24, fontWeight: "700", color: colors.primary },
  cardBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 16, gap: 4 },
  metricCardValue: { color: colors.primary, fontSize: 22, fontWeight: "700" },
  metricCardLabel: { color: colors.muted, fontSize: 12 },
});
