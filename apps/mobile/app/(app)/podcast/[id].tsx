import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

import { LoadingScreen } from "@/src/components/loading-screen";
import { Screen } from "@/src/components/screen";
import { episodesApi, type Episode } from "@/src/lib/api";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";

export default function PodcastScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    episodesApi
      .getById(params.id)
      .then(setEpisode)
      .catch(() => setError("Could not load this episode."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <LoadingScreen label="Loading episode..." />;
  }

  return (
    <Screen>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      {error || !episode ? (
        <View style={styles.card}>
          <Text style={styles.error}>{error || "Episode not found."}</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{episode.title}</Text>
            <Text style={styles.subtitle}>
              {episode.status} · {new Date(episode.created_at).toLocaleDateString("en-US")}
            </Text>
          </View>

          <View style={styles.tagRow}>
            {episode.themes.map((themeId) => {
              const theme = themeColors[themeId as ThemeId];

              if (!theme) {
                return null;
              }

              return (
                <View key={themeId} style={[styles.tag, { borderColor: theme.color }]}>
                  <Text style={[styles.tagText, { color: theme.color }]}>
                    {theme.icon} {theme.name}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Playback migration note</Text>
            <Text style={styles.body}>
              The route and data fetching are in place. The next Expo-native step here is swapping the
              web audio element for `expo-audio` or `expo-av`, then rebuilding the scrubber and
              karaoke transcript view.
            </Text>
            <Text style={styles.body}>
              Audio URL: {episode.audio_url ?? "No audio yet"}
            </Text>
          </View>

          {episode.script ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Script</Text>
              <Text style={styles.body}>{episode.script}</Text>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    color: colors.muted,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
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
  body: {
    color: colors.muted,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
  },
});
