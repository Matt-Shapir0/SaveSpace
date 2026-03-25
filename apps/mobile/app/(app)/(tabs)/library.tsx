import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";

import { Screen } from "@/src/components/screen";
import { episodesApi, type EpisodeSummary, videosApi, type Video } from "@/src/lib/api";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

type TabType = "podcasts" | "videos";

export default function LibraryScreen() {
  const { userId } = useUser();
  const [tab, setTab] = useState<TabType>("podcasts");
  const [videos, setVideos] = useState<Video[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setError(null);
      const [nextVideos, nextEpisodes] = await Promise.all([
        videosApi.getByUser(userId),
        episodesApi.listByUser(userId),
      ]);
      setVideos(nextVideos);
      setEpisodes(nextEpisodes);
    } catch {
      setError("Could not load your library.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddVideo() {
    if (!userId || !url.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await videosApi.submit(url.trim(), userId);
      setUrl("");
      await loadData();
      setTab("videos");
    } catch {
      setError("Could not save that URL. Double-check the link and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateEpisode() {
    if (!userId) {
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      await episodesApi.generate(userId);
      await loadData();
    } catch {
      setError("Episode generation failed. Make sure at least one video has finished processing.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>
          Videos and generated episodes are now mapped into the Expo app structure.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Save a video</Text>
        <TextInput
          placeholder="Paste a TikTok or Reel URL"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={url}
          onChangeText={setUrl}
        />
        <Pressable
          style={[styles.primaryButton, (!url.trim() || submitting) && styles.buttonDisabled]}
          onPress={handleAddVideo}
          disabled={!url.trim() || submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save video</Text>}
        </Pressable>
      </View>

      <View style={styles.segmented}>
        {(["podcasts", "videos"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.segment, tab === value && styles.segmentActive]}
            onPress={() => setTab(value)}
          >
            <Text style={[styles.segmentText, tab === value && styles.segmentTextActive]}>
              {value === "podcasts" ? "Podcasts" : "Videos"}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {tab === "podcasts" ? (
        <View style={styles.card}>
          <Pressable
            style={[styles.primaryButton, generating && styles.buttonDisabled]}
            onPress={handleGenerateEpisode}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate new episode</Text>
            )}
          </Pressable>

          {episodes.length === 0 ? (
            <Text style={styles.empty}>No episodes yet.</Text>
          ) : (
            episodes.map((episode) => (
              <Link key={episode.id} href={`/(app)/podcast/${episode.id}`} asChild>
                <Pressable style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{episode.title}</Text>
                  <Text style={styles.rowSubtitle}>
                    {episode.status} · {new Date(episode.created_at).toLocaleDateString("en-US")}
                  </Text>
                </Pressable>
              </Link>
            ))
          )}
        </View>
      ) : (
        <View style={styles.card}>
          {videos.length === 0 ? (
            <Text style={styles.empty}>No videos saved yet.</Text>
          ) : (
            videos.map((video) => (
              <View key={video.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{video.caption || video.url}</Text>
                <Text style={styles.rowSubtitle}>
                  {video.status} · {new Date(video.created_at).toLocaleDateString("en-US")}
                </Text>
                <View style={styles.tagRow}>
                  {(video.theme_tags ?? []).slice(0, 3).map((themeId) => {
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
              </View>
            ))
          )}
        </View>
      )}
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
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  label: {
    color: colors.text,
    fontWeight: "600",
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
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  segmentActive: {
    backgroundColor: colors.card,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.text,
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
  rowCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  rowSubtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  empty: {
    color: colors.muted,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
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
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
