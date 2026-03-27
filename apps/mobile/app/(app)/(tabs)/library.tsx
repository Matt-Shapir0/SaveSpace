import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/screen";
import { episodesApi, type EpisodeSummary } from "@/src/lib/api";
import {
  getLikedEpisodes,
  getSavedCollections,
  toggleLikedEpisode,
  type SavedCollection,
} from "@/src/lib/storage";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

const COVER_EMOJIS = ["🎧", "🌅", "🪴"];
const POLL_INTERVAL_MS = 8000;

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

function CollectionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.collectionChip, active && styles.collectionChipActive]} onPress={onPress}>
      <Text style={[styles.collectionChipText, active && styles.collectionChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EpisodeCard({
  episode,
  index,
  liked,
  onDelete,
  onToggleLike,
}: {
  episode: EpisodeSummary;
  index: number;
  liked: boolean;
  onDelete: (id: string) => Promise<void>;
  onToggleLike: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    Alert.alert("Delete episode?", "This will remove the generated episode from your library.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);

          try {
            await onDelete(episode.id);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (episode.status === "generating") {
    return (
      <View style={styles.generatingCard}>
        <View style={styles.generatingBadge}>
          <ActivityIndicator color={colors.primary} />
        </View>
        <View style={styles.generatingCopy}>
          <Text style={styles.generatingTitle}>Generating episode...</Text>
          <Text style={styles.generatingSubtitle}>This usually takes about 30-60 seconds.</Text>
        </View>
      </View>
    );
  }

  if (episode.status === "failed") {
    return (
      <View style={styles.failedCard}>
        <View style={styles.failedCopy}>
          <Text style={styles.failedTitle}>Generation failed</Text>
          <Text style={styles.failedSubtitle}>
            {episode.error_message?.slice(0, 100) || "Something went wrong while generating audio."}
          </Text>
        </View>
        <Pressable disabled={deleting} onPress={handleDelete} style={styles.iconButton}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.episodeWrap}>
      <Link href={`/(app)/podcast/${episode.id}`} asChild>
        <Pressable style={styles.episodeCard}>
          <View style={styles.coverBadge}>
            <Text style={styles.coverBadgeText}>{COVER_EMOJIS[index % COVER_EMOJIS.length]}</Text>
          </View>

          <View style={styles.episodeCopy}>
            <Text style={styles.episodeTitle}>{episode.title}</Text>
            <Text style={styles.episodeMeta}>
              {formatShortDate(episode.created_at)}
              {formatDuration(episode.audio_duration) ? ` · ${formatDuration(episode.audio_duration)}` : ""}
            </Text>
            <View style={styles.themeRow}>
              {(episode.themes ?? []).slice(0, 2).map((themeId) => (
                <ThemePill key={themeId} themeId={themeId} />
              ))}
            </View>
          </View>
        </Pressable>
      </Link>

      <View style={styles.episodeActions}>
        <Pressable style={styles.iconButton} onPress={() => onToggleLike(episode.id)}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={18}
            color={liked ? colors.primary : colors.muted}
          />
        </Pressable>
        <Pressable style={styles.iconButton} disabled={deleting} onPress={handleDelete}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const { userId } = useUser();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [likedEpisodes, setLikedEpisodes] = useState<string[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!userId) {
        return;
      }

      if (!silent) {
        setRefreshing(true);
      }

      try {
        setError(null);
        const [nextEpisodes, nextLikedEpisodes, nextCollections] = await Promise.all([
          episodesApi.listByUser(userId),
          getLikedEpisodes(userId),
          getSavedCollections(userId),
        ]);
        setEpisodes(nextEpisodes);
        setLikedEpisodes(nextLikedEpisodes);
        setCollections(nextCollections);
      } catch {
        setError("Couldn't load your library.");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData({ silent: true });
    }, [loadData])
  );

  const hasBackgroundWork = useMemo(
    () => episodes.some((episode) => episode.status === "generating"),
    [episodes]
  );

  useEffect(() => {
    if (!hasBackgroundWork) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      loadData({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasBackgroundWork, loadData]);

  const likedSet = useMemo(() => new Set(likedEpisodes), [likedEpisodes]);
  const featuredEpisode = episodes.find((episode) => episode.status === "done") ?? null;
  const likedCount = likedEpisodes.length;
  const selectedCollection =
    selectedCollectionId === "all"
      ? null
      : collections.find((collection) => collection.id === selectedCollectionId) ?? null;

  async function handleDeleteEpisode(id: string) {
    await episodesApi.delete(id);
    setEpisodes((current) => current.filter((episode) => episode.id !== id));
    setLikedEpisodes((current) => current.filter((episodeId) => episodeId !== id));
  }

  async function handleToggleLike(id: string) {
    if (!userId) {
      return;
    }

    const next = await toggleLikedEpisode(userId, id);
    setLikedEpisodes(next);
  }

  async function handleGenerateEpisode() {
    if (!userId) {
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      await episodesApi.generate(userId);
      await loadData({ silent: true });
    } catch (value: unknown) {
      const message = value instanceof Error ? value.message : "";
      setError(
        message.includes("400")
          ? "Save and process at least one video first."
          : "Generation failed. Try again."
      );
    } finally {
      setGenerating(false);
    }
  }

  if (initialLoading) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Your generated episodes, favorites, and listening history.</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={() => loadData()}>
          {refreshing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          )}
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroMetrics}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{episodes.length}</Text>
            <Text style={styles.metricLabel}>Episodes</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{likedCount}</Text>
            <Text style={styles.metricLabel}>Liked</Text>
          </View>
        </View>

        <View style={styles.collectionPicker}>
          <Text style={styles.collectionPickerLabel}>Generate from</Text>
          <View style={styles.collectionPickerRow}>
            <CollectionChip
              label="All saved content"
              active={selectedCollectionId === "all"}
              onPress={() => setSelectedCollectionId("all")}
            />
            {collections.map((collection) => (
              <CollectionChip
                key={collection.id}
                label={collection.name}
                active={selectedCollectionId === collection.id}
                onPress={() => setSelectedCollectionId(collection.id)}
              />
            ))}
          </View>
          <Text style={styles.collectionPickerHint}>
            {selectedCollection
              ? `${selectedCollection.videoIds.length} saved posts are currently in ${selectedCollection.name}.`
              : "Choose a collection to preview collection-based generation in the UI."}
          </Text>
          {selectedCollection ? (
            <Text style={styles.collectionPickerNote}>
              Frontend preview: generation still uses your full saved library until collection support is added on the backend.
            </Text>
          ) : null}
        </View>

        <Pressable
          style={[styles.generateButton, generating && styles.buttonDisabled]}
          onPress={handleGenerateEpisode}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>
              {selectedCollection ? `Generate from ${selectedCollection.name}` : "Generate New Episode"}
            </Text>
          )}
        </Pressable>
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
          <Link href={`/(app)/podcast/${featuredEpisode.id}`} asChild>
            <Pressable style={styles.playFeatured}>
              <Text style={styles.playFeaturedText}>Open Featured Episode</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {episodes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎧</Text>
          <Text style={styles.emptyTitle}>No episodes yet</Text>
          <Text style={styles.emptyBody}>
            Generate your first personalized podcast from the content you have saved.
          </Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {episodes.map((episode, index) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              index={index}
              liked={likedSet.has(episode.id)}
              onDelete={handleDeleteEpisode}
              onToggleLike={handleToggleLike}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 30, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 4, maxWidth: 280 },
  refreshButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  heroMetrics: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  metricValue: { color: colors.primary, fontSize: 24, fontWeight: "700" },
  metricLabel: { color: colors.muted, fontSize: 12 },
  collectionPicker: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  collectionPickerLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  collectionPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  collectionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collectionChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  collectionChipText: {
    color: colors.muted,
    fontWeight: "600",
  },
  collectionChipTextActive: {
    color: colors.primary,
  },
  collectionPickerHint: {
    color: colors.text,
    fontSize: 13,
  },
  collectionPickerNote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  generateButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  featuredCard: { backgroundColor: colors.primarySoft, borderRadius: 24, padding: 18, gap: 8 },
  featuredLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  featuredTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  featuredMeta: { color: colors.muted, fontSize: 13 },
  playFeatured: {
    marginTop: 6,
    backgroundColor: colors.text,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  playFeaturedText: { color: "#fff", fontWeight: "700" },
  stack: { gap: 12 },
  generatingCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: `${colors.primary}50`,
    borderRadius: 22,
    padding: 16,
  },
  generatingBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  generatingCopy: { flex: 1, gap: 4 },
  generatingTitle: { color: colors.text, fontWeight: "700" },
  generatingSubtitle: { color: colors.muted, fontSize: 13 },
  failedCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    borderRadius: 22,
    padding: 16,
  },
  failedCopy: { flex: 1, gap: 4 },
  failedTitle: { color: colors.danger, fontWeight: "700" },
  failedSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  episodeWrap: { position: "relative" },
  episodeCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 16,
    paddingRight: 88,
  },
  coverBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  coverBadgeText: { fontSize: 30 },
  episodeCopy: { flex: 1, gap: 6 },
  episodeTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  episodeMeta: { color: colors.muted, fontSize: 13 },
  episodeActions: { position: "absolute", top: 16, right: 12, flexDirection: "row", gap: 4 },
  iconButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  themePillText: { fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13 },
  emptyState: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  emptyBody: { color: colors.muted, lineHeight: 20, textAlign: "center" },
  buttonDisabled: { opacity: 0.6 },
});
