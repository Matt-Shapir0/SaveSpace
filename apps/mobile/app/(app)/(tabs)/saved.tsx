import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/screen";
import { videosApi, type Video } from "@/src/lib/api";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

const POLL_INTERVAL_MS = 8000;
const sourceOptions = ["all", "instagram", "tiktok", "other"] as const;
const statusOptions = ["all", "ready", "processing"] as const;
const sortOptions = ["recent", "source", "theme"] as const;

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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
      <Text style={styles.sectionTitle}>Save social content</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://www.instagram.com/..."
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

  async function handleDelete() {
    Alert.alert("Delete saved item?", "This will remove the saved post from your source library.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await onDelete(video.id);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.videoCard}>
      <View style={styles.videoMetaRow}>
        <Text style={styles.videoMetaText}>
          {(video.source || "video").toUpperCase()} · {formatShortDate(video.created_at)}
        </Text>
        <View style={styles.videoMetaActions}>
          <Pressable onPress={() => Linking.openURL(video.url)}>
            <Text style={styles.linkText}>Open</Text>
          </Pressable>
          <Pressable style={styles.iconButton} disabled={deleting} onPress={handleDelete}>
            {deleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            )}
          </Pressable>
        </View>
      </View>

      <Text style={styles.videoTitle}>{video.caption || video.url}</Text>
      {video.transcript ? <Text style={styles.videoExcerpt}>{video.transcript.slice(0, 120)}...</Text> : null}

      <View style={styles.themeRow}>
        {(video.theme_tags ?? []).slice(0, 3).map((themeId) => (
          <ThemePill key={themeId} themeId={themeId} />
        ))}
      </View>

      <Text style={styles.inlineNote}>
        {video.status === "done"
          ? "Saved"
          : "Still processing. This updates automatically."}
      </Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function SavedScreen() {
  const { userId } = useUser();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceOptions)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("all");
  const [sortMode, setSortMode] = useState<(typeof sortOptions)[number]>("recent");

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
        setVideos(await videosApi.getByUser(userId));
      } catch {
        setError("Couldn't load your saved content.");
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

  useEffect(() => {
    if (!videos.some((video) => video.status === "pending" || video.status === "processing")) {
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
  }, [loadData, videos]);

  const filteredVideos = useMemo(() => {
    let next = [...videos];

    if (sourceFilter !== "all") {
      next = next.filter((video) =>
        sourceFilter === "other"
          ? !["instagram", "tiktok"].includes((video.source || "").toLowerCase())
          : (video.source || "").toLowerCase().includes(sourceFilter)
      );
    }

    if (statusFilter === "ready") {
      next = next.filter((video) => video.status === "done");
    }

    if (statusFilter === "processing") {
      next = next.filter((video) => video.status === "pending" || video.status === "processing");
    }

    if (sortMode === "source") {
      next.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
    } else if (sortMode === "theme") {
      next.sort((a, b) => (a.theme_tags?.[0] || "").localeCompare(b.theme_tags?.[0] || ""));
    } else {
      next.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }

    return next;
  }, [sortMode, sourceFilter, statusFilter, videos]);

  async function handleDeleteVideo(id: string) {
    await videosApi.deleteVideo(id);
    setVideos((current) => current.filter((video) => video.id !== id));
  }

  if (initialLoading) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved</Text>
          <Text style={styles.subtitle}>All imported social posts, clips, and saved source material.</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={() => loadData()}>
          {refreshing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {userId ? <AddVideoInput userId={userId} onAdded={() => loadData({ silent: true })} /> : null}

      <View style={styles.organizeCard}>
        <Text style={styles.sectionTitle}>Organize saved content</Text>
        {/* <Text style={styles.organizeBody}>
          This is the UI foundation for future organization. We can wire folders, collections, and custom tags once the backend schema is ready.
        </Text> */}
        <Text style={styles.filterLabel}>Source</Text>
        <View style={styles.filterRow}>
          {sourceOptions.map((option) => (
            <FilterChip
              key={option}
              label={option}
              active={sourceFilter === option}
              onPress={() => setSourceFilter(option)}
            />
          ))}
        </View>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filterRow}>
          {statusOptions.map((option) => (
            <FilterChip
              key={option}
              label={option}
              active={statusFilter === option}
              onPress={() => setStatusFilter(option)}
            />
          ))}
        </View>
        <Text style={styles.filterLabel}>Sort</Text>
        <View style={styles.filterRow}>
          {sortOptions.map((option) => (
            <FilterChip
              key={option}
              label={option}
              active={sortMode === option}
              onPress={() => setSortMode(option)}
            />
          ))}
        </View>
        <View style={styles.placeholderRow}>
          <View style={styles.placeholderPill}>
            <Text style={styles.placeholderPillText}>Collections soon</Text>
          </View>
          <View style={styles.placeholderPill}>
            <Text style={styles.placeholderPillText}>Folders soon</Text>
          </View>
          <View style={styles.placeholderPill}>
            <Text style={styles.placeholderPillText}>Bulk edit soon</Text>
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {filteredVideos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📥</Text>
          <Text style={styles.emptyTitle}>No saved content yet</Text>
          <Text style={styles.emptyBody}>Add a TikTok or Instagram URL above to start building your source library.</Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={handleDeleteVideo} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  title: { fontSize: 30, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 4, maxWidth: 280 },
  refreshButton: { width: 40, height: 40, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickAddButton: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15 },
  quickAddIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  quickAddIconText: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  quickAddLabel: { flex: 1, color: colors.muted, fontSize: 14 },
  quickAddArrow: { color: colors.muted, fontSize: 16 },
  addCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: colors.text },
  addActions: { flexDirection: "row", gap: 10 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  ghostButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  ghostButtonText: { color: colors.text, fontWeight: "600" },
  organizeCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 18, gap: 12 },
  organizeBody: { color: colors.muted, lineHeight: 20 },
  filterLabel: { color: colors.text, fontWeight: "600" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterChipText: { color: colors.muted, textTransform: "capitalize" },
  filterChipTextActive: { color: colors.primary, fontWeight: "700" },
  placeholderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  placeholderPill: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  placeholderPillText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  stack: { gap: 12 },
  videoCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 16, gap: 10 },
  videoMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  videoMetaText: { color: colors.muted, fontSize: 12, flex: 1 },
  videoMetaActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  linkText: { color: colors.primary, fontWeight: "600" },
  iconButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  videoTitle: { color: colors.text, fontWeight: "700", lineHeight: 21 },
  videoExcerpt: { color: colors.muted, fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  inlineNote: { color: colors.muted, fontSize: 12 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#fff" },
  themePillText: { fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13 },
  emptyState: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 28, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  emptyBody: { color: colors.muted, lineHeight: 20, textAlign: "center" },
  buttonDisabled: { opacity: 0.6 },
});
