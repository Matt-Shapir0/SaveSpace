import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/screen";
import { episodesApi, type EpisodeSummary, videosApi, type Video } from "@/src/lib/api";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

type TabType = "podcasts" | "videos";

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

function videoStatusCopy(status: Video["status"]) {
  switch (status) {
    case "done":
      return { label: "Ready", color: colors.success };
    case "processing":
      return { label: "Processing", color: "#4d8af0" };
    case "pending":
      return { label: "Queued", color: "#e0a33f" };
    case "failed":
      return { label: "Failed", color: colors.danger };
  }
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

function AddVideoInput({
  userId,
  onAdded,
}: {
  userId: string;
  onAdded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!url.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await videosApi.submit(url.trim(), userId);
      setUrl("");
      setOpen(false);
      await onAdded();
    } catch {
      setError("Couldn't save that URL. Check it and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Pressable style={styles.quickAddButton} onPress={() => setOpen(true)}>
        <View style={styles.quickAddIcon}>
          <Text style={styles.quickAddIconText}>+</Text>
        </View>
        <Text style={styles.quickAddLabel}>Paste a TikTok or Reel URL...</Text>
        <Text style={styles.quickAddArrow}>↗</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.addCard}>
      <Text style={styles.sectionTitle}>Save a video</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://www.tiktok.com/..."
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={url}
        onChangeText={setUrl}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.addActions}>
        <Pressable
          style={[styles.primaryButton, (!url.trim() || saving) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!url.trim() || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save</Text>}
        </Pressable>
        <Pressable
          style={styles.ghostButton}
          onPress={() => {
            setOpen(false);
            setUrl("");
            setError(null);
          }}
        >
          <Text style={styles.ghostButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function VideoCard({
  video,
  onDelete,
}: {
  video: Video;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const status = videoStatusCopy(video.status);

  async function handleDelete() {
    setDeleting(true);

    try {
      await onDelete(video.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.videoCard}>
      <View style={styles.videoMetaRow}>
        <View style={styles.videoMetaLeft}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={styles.videoMetaText}>
            {video.source || "video"} · {formatShortDate(video.created_at)}
          </Text>
        </View>
        <View style={styles.videoMetaActions}>
          <Pressable onPress={() => Linking.openURL(video.url)}>
            <Text style={styles.linkText}>Open</Text>
          </Pressable>
          <Pressable disabled={deleting} onPress={handleDelete}>
            <Text style={styles.deleteText}>{deleting ? "..." : "Delete"}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.videoTitle}>{video.caption || video.url}</Text>

      {video.status === "done" && video.transcript ? (
        <Text style={styles.videoExcerpt}>{video.transcript.slice(0, 120)}...</Text>
      ) : null}

      {(video.theme_tags ?? []).length > 0 ? (
        <View style={styles.themeRow}>
          {(video.theme_tags ?? []).map((themeId) => (
            <ThemePill key={themeId} themeId={themeId} />
          ))}
        </View>
      ) : null}

      {video.status === "failed" ? (
        <Text style={styles.inlineNote}>Processing failed. The source may be private.</Text>
      ) : null}

      {(video.status === "pending" || video.status === "processing") ? (
        <Text style={styles.inlineNote}>Extracting transcript and themes...</Text>
      ) : null}
    </View>
  );
}

function ThemeGroupCard({
  themeId,
  videos,
  onPress,
}: {
  themeId: ThemeId;
  videos: Video[];
  onPress: () => void;
}) {
  const theme = themeColors[themeId];
  const latest = videos.find((video) => video.transcript || video.caption);

  return (
    <Pressable
      style={[styles.themeCard, { borderColor: `${theme.color}55`, backgroundColor: `${theme.color}12` }]}
      onPress={onPress}
    >
      <View style={styles.themeCardHeader}>
        <View style={styles.themeCardCopy}>
          <Text style={styles.themeEmoji}>{theme.icon}</Text>
          <View>
            <Text style={styles.themeCardTitle}>{theme.name}</Text>
            <Text style={styles.themeCardSubtitle}>
              {videos.length} video{videos.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      {latest?.transcript || latest?.caption ? (
        <View style={styles.themeCardPreview}>
          <Text style={styles.themeCardPreviewText}>
            Latest: {(latest.transcript || latest.caption || "").slice(0, 100)}...
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function EpisodeCard({
  episode,
  index,
  onDelete,
}: {
  episode: EpisodeSummary;
  index: number;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);

    try {
      await onDelete(episode.id);
    } finally {
      setDeleting(false);
    }
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
        <Pressable disabled={deleting} onPress={handleDelete}>
          <Text style={styles.deleteText}>{deleting ? "..." : "Delete"}</Text>
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

      <Pressable style={styles.episodeDelete} disabled={deleting} onPress={handleDelete}>
        <Text style={styles.deleteText}>{deleting ? "..." : "Delete"}</Text>
      </Pressable>
    </View>
  );
}

export default function LibraryScreen() {
  const { userId } = useUser();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tab, setTab] = useState<TabType>("podcasts");
  const [videos, setVideos] = useState<Video[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(null);
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
        const [nextVideos, nextEpisodes] = await Promise.all([
          videosApi.getByUser(userId),
          episodesApi.listByUser(userId),
        ]);
        setVideos(nextVideos);
        setEpisodes(nextEpisodes);
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
    () =>
      videos.some((video) => video.status === "pending" || video.status === "processing") ||
      episodes.some((episode) => episode.status === "generating"),
    [episodes, videos]
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

  const groupedVideos = useMemo(() => {
    const groups: Partial<Record<ThemeId, Video[]>> = {};

    for (const video of videos) {
      if (video.status === "done" && (video.theme_tags ?? []).length > 0) {
        for (const themeId of video.theme_tags as ThemeId[]) {
          groups[themeId] = groups[themeId] ? [...groups[themeId]!, video] : [video];
        }
      }
    }

    return groups;
  }, [videos]);

  const processingVideos = useMemo(
    () => videos.filter((video) => video.status !== "done" || !(video.theme_tags ?? []).length),
    [videos]
  );

  const selectedThemeVideos = selectedTheme ? groupedVideos[selectedTheme] ?? [] : [];

  async function handleDeleteVideo(id: string) {
    await videosApi.deleteVideo(id);
    setVideos((current) => current.filter((video) => video.id !== id));
  }

  async function handleDeleteEpisode(id: string) {
    await episodesApi.delete(id);
    setEpisodes((current) => current.filter((episode) => episode.id !== id));
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
      setTab("podcasts");
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
          <Text style={styles.title}>Your Library</Text>
          <Text style={styles.subtitle}>
            Your saved videos and podcast episodes now refresh in the background while work finishes.
          </Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={() => loadData()}>
          {refreshing ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.refreshText}>Refresh</Text>}
        </Pressable>
      </View>

      {userId ? <AddVideoInput userId={userId} onAdded={() => loadData({ silent: true })} /> : null}

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
        <>
          <Pressable
            style={[styles.generateButton, generating && styles.buttonDisabled]}
            onPress={handleGenerateEpisode}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Generate New Episode</Text>
            )}
          </Pressable>

          {episodes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎧</Text>
              <Text style={styles.emptyTitle}>No episodes yet</Text>
              <Text style={styles.emptyBody}>
                Generate your first personalized podcast from the videos you have saved.
              </Text>
            </View>
          ) : (
            <View style={styles.stack}>
              {episodes.map((episode, index) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  index={index}
                  onDelete={handleDeleteEpisode}
                />
              ))}
            </View>
          )}
        </>
      ) : selectedTheme ? (
        <>
          <Pressable style={styles.backLink} onPress={() => setSelectedTheme(null)}>
            <Text style={styles.backLinkText}>Back to themes</Text>
          </Pressable>

          <View style={styles.detailHeader}>
            <Text style={styles.themeEmoji}>{themeColors[selectedTheme].icon}</Text>
            <View>
              <Text style={styles.detailTitle}>{themeColors[selectedTheme].name}</Text>
              <Text style={styles.detailSubtitle}>
                {selectedThemeVideos.length} video{selectedThemeVideos.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          <View style={styles.stack}>
            {selectedThemeVideos.map((video) => (
              <VideoCard key={video.id} video={video} onDelete={handleDeleteVideo} />
            ))}
          </View>
        </>
      ) : videos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📱</Text>
          <Text style={styles.emptyTitle}>No saved videos yet</Text>
          <Text style={styles.emptyBody}>Paste a TikTok or Reel URL above to get started.</Text>
        </View>
      ) : (
        <>
          <View style={styles.stack}>
            {Object.entries(groupedVideos).map(([themeId, themeVideos]) => (
              <ThemeGroupCard
                key={themeId}
                themeId={themeId as ThemeId}
                videos={themeVideos ?? []}
                onPress={() => setSelectedTheme(themeId as ThemeId)}
              />
            ))}
          </View>

          {processingVideos.length > 0 ? (
            <View style={styles.processingSection}>
              <Text style={styles.processingHeading}>
                Processing · {processingVideos.length} video{processingVideos.length !== 1 ? "s" : ""}
              </Text>
              <View style={styles.stack}>
                {processingVideos.map((video) => (
                  <VideoCard key={video.id} video={video} onDelete={handleDeleteVideo} />
                ))}
              </View>
            </View>
          ) : null}
        </>
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
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
    marginTop: 4,
    maxWidth: 280,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: "center",
  },
  refreshText: {
    color: colors.primary,
    fontWeight: "700",
  },
  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  quickAddIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAddIconText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  quickAddLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 14,
  },
  quickAddArrow: {
    color: colors.muted,
    fontSize: 16,
  },
  addCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
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
  addActions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: {
    color: colors.text,
    fontWeight: "600",
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
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  generateButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  stack: {
    gap: 12,
  },
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
  emptyEmoji: {
    fontSize: 34,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyBody: {
    color: colors.muted,
    lineHeight: 20,
    textAlign: "center",
  },
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
  generatingCopy: {
    flex: 1,
    gap: 4,
  },
  generatingTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  generatingSubtitle: {
    color: colors.muted,
    fontSize: 13,
  },
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
  failedCopy: {
    flex: 1,
    gap: 4,
  },
  failedTitle: {
    color: colors.danger,
    fontWeight: "700",
  },
  failedSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  episodeWrap: {
    position: "relative",
  },
  episodeCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 16,
    paddingRight: 70,
  },
  coverBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  coverBadgeText: {
    fontSize: 30,
  },
  episodeCopy: {
    flex: 1,
    gap: 6,
  },
  episodeTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  episodeMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  episodeDelete: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: "600",
  },
  videoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  videoMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  videoMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  videoMetaActions: {
    flexDirection: "row",
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  videoMetaText: {
    color: colors.muted,
    fontSize: 12,
  },
  linkText: {
    color: colors.primary,
    fontWeight: "600",
  },
  videoTitle: {
    color: colors.text,
    fontWeight: "700",
    lineHeight: 21,
  },
  videoExcerpt: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  inlineNote: {
    color: colors.muted,
    fontSize: 12,
  },
  themeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  themePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  themeCard: {
    borderWidth: 2,
    borderRadius: 26,
    padding: 18,
    gap: 12,
  },
  themeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  themeCardCopy: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    flex: 1,
  },
  themeEmoji: {
    fontSize: 30,
  },
  themeCardTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 18,
  },
  themeCardSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  themeCardPreview: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeCardPreviewText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  chevron: {
    color: colors.muted,
    fontSize: 24,
  },
  processingSection: {
    gap: 12,
  },
  processingHeading: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  backLink: {
    alignSelf: "flex-start",
  },
  backLinkText: {
    color: colors.primary,
    fontWeight: "600",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  detailSubtitle: {
    color: colors.muted,
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
