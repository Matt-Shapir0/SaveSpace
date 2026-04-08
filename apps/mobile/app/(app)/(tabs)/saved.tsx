import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/src/components/screen";
import { videosApi, type Video } from "@/src/lib/api";
import {
  createSavedCollection,
  getSavedCollections,
  toggleVideoInCollection,
  type SavedCollection,
} from "@/src/lib/storage";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";
import { useUser } from "@/src/lib/useUser";

const POLL_INTERVAL_MS = 8000;
const sourceOptions = ["all", "instagram", "tiktok", "other"] as const;
const statusOptions = ["all", "ready", "processing"] as const;
const sortOptions = ["recent", "source", "theme"] as const;
const collectionColors = ["#d96f45", "#5d8b6d", "#457b9d", "#9c6644", "#b56576"];

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

function getStatusMeta(status: Video["status"], errorMessage: string | null) {
  if (status === "done") {
    return {
      label: "Saved",
      detail: "Ready to use in your library.",
      backgroundColor: "#e3f1e7",
      textColor: colors.success,
    };
  }

  if (status === "failed") {
    return {
      label: "Failed",
      detail: errorMessage || "We couldn't process this post. Try sharing it again later.",
      backgroundColor: "#f7e1dc",
      textColor: colors.danger,
    };
  }

  return {
    label: status === "pending" ? "Queued" : "Processing",
    detail: "Still processing. This updates automatically.",
    backgroundColor: colors.primarySoft,
    textColor: colors.primary,
  };
}

function formatCreatorHandle(author: string | null) {
  if (!author) {
    return null;
  }

  return author.startsWith("@") ? author : `@${author}`;
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
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Save</Text>
          )}
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

function AlbumPreview({
  color,
  accent,
}: {
  color: string;
  accent: string;
}) {
  return (
    <View style={styles.albumPreview}>
      <View style={[styles.albumTileLarge, { backgroundColor: `${color}55` }]} />
      <View style={styles.albumPreviewColumn}>
        <View style={[styles.albumTileSmall, { backgroundColor: `${accent}66` }]} />
        <View style={[styles.albumTileSmall, { backgroundColor: `${color}33` }]} />
      </View>
    </View>
  );
}

function CollectionAlbumCard({
  label,
  count,
  subtitle,
  color,
  active,
  onPress,
}: {
  label: string;
  count: number;
  subtitle: string;
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.albumCard, active && styles.albumCardActive]}
      onPress={onPress}
    >
      <AlbumPreview color={color} accent={colors.surface} />
      <Text style={styles.albumTitle} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.albumMeta}>{count} posts</Text>
      <Text style={styles.albumSubtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

function VideoCard({
  video,
  collections,
  activeCollection,
  onDelete,
  onToggleCollection,
}: {
  video: Video;
  collections: SavedCollection[];
  activeCollection: SavedCollection | null;
  onDelete: (id: string) => Promise<void>;
  onToggleCollection: (collectionId: string, videoId: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const videoCollections = collections.filter((collection) => collection.videoIds.includes(video.id));
  const activeCollectionContainsVideo =
    activeCollection ? activeCollection.videoIds.includes(video.id) : false;
  const statusMeta = getStatusMeta(video.status, video.error_message);
  const creatorHandle = formatCreatorHandle(video.author);
  const headline = video.title || video.caption || video.url;

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

      {video.thumbnail_url ? (
        <Image source={{ uri: video.thumbnail_url }} style={styles.thumbnail} contentFit="cover" />
      ) : null}

      <View style={styles.videoStatusRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusMeta.backgroundColor }]}>
          <Text style={[styles.statusBadgeText, { color: statusMeta.textColor }]}>{statusMeta.label}</Text>
        </View>
        {creatorHandle ? <Text style={styles.creatorHandle}>{creatorHandle}</Text> : null}
      </View>

      <Text style={styles.videoTitle}>{headline}</Text>
      {video.caption && video.title && video.caption !== video.title ? (
        <Text style={styles.videoDescription} numberOfLines={3}>
          {video.caption}
        </Text>
      ) : null}
      {video.transcript ? <Text style={styles.videoExcerpt}>{video.transcript.slice(0, 120)}...</Text> : null}

      <View style={styles.themeRow}>
        {(video.theme_tags ?? []).slice(0, 3).map((themeId) => (
          <ThemePill key={themeId} themeId={themeId} />
        ))}
      </View>

      {videoCollections.length > 0 ? (
        <View style={styles.themeRow}>
          {videoCollections.map((collection) => (
            <View
              key={collection.id}
              style={[styles.assignedCollectionPill, { borderColor: collection.color }]}
            >
              <Text style={[styles.assignedCollectionText, { color: collection.color }]}>
                {collection.name}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.inlineNote}>Not in a collection yet.</Text>
      )}

      {activeCollection ? (
        <Pressable
          style={[
            styles.collectionActionButton,
            activeCollectionContainsVideo && styles.collectionActionButtonActive,
          ]}
          onPress={() => onToggleCollection(activeCollection.id, video.id)}
        >
          <Ionicons
            name={activeCollectionContainsVideo ? "remove-circle-outline" : "add-circle-outline"}
            size={16}
            color={activeCollectionContainsVideo ? colors.text : activeCollection.color}
          />
          <Text style={styles.collectionActionText}>
            {activeCollectionContainsVideo
              ? `Remove from ${activeCollection.name}`
              : `Add to ${activeCollection.name}`}
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.inlineNote}>{statusMeta.detail}</Text>
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
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceOptions)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("all");
  const [sortMode, setSortMode] = useState<(typeof sortOptions)[number]>("recent");
  const [activeCollectionId, setActiveCollectionId] = useState<string>("all");

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
        const [nextVideos, nextCollections] = await Promise.all([
          videosApi.getByUser(userId),
          getSavedCollections(userId),
        ]);
        setVideos(nextVideos);
        setCollections(nextCollections);
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

  const collectionLookup = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections]
  );

  const activeCollection =
    activeCollectionId !== "all" && activeCollectionId !== "unassigned"
      ? collectionLookup.get(activeCollectionId) ?? null
      : null;

  const assignedVideoIds = useMemo(
    () => new Set(collections.flatMap((collection) => collection.videoIds)),
    [collections]
  );

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

    if (activeCollectionId === "unassigned") {
      next = next.filter((video) => !assignedVideoIds.has(video.id));
    } else if (activeCollection) {
      next = next.filter((video) => activeCollection.videoIds.includes(video.id));
    }

    if (sortMode === "source") {
      next.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
    } else if (sortMode === "theme") {
      next.sort((a, b) => (a.theme_tags?.[0] || "").localeCompare(b.theme_tags?.[0] || ""));
    } else {
      next.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }

    return next;
  }, [activeCollection, activeCollectionId, assignedVideoIds, sortMode, sourceFilter, statusFilter, videos]);

  async function handleDeleteVideo(id: string) {
    await videosApi.deleteVideo(id);
    setVideos((current) => current.filter((video) => video.id !== id));
  }

  async function handleCreateCollection() {
    if (!userId || !collectionName.trim()) {
      return;
    }

    setCreatingCollection(true);

    try {
      const nextCollections = await createSavedCollection(userId, {
        name: collectionName.trim(),
        description: collectionDescription.trim() || "A custom mix for future episode generation.",
        color: collectionColors[collections.length % collectionColors.length],
        videoIds: [],
      });

      setCollections(nextCollections);
      setActiveCollectionId(nextCollections[0]?.id ?? "all");
      setCollectionName("");
      setCollectionDescription("");
      setShowCollectionModal(false);
    } finally {
      setCreatingCollection(false);
    }
  }

  async function handleToggleCollection(collectionId: string, videoId: string) {
    if (!userId) {
      return;
    }

    const nextCollections = await toggleVideoInCollection(userId, collectionId, videoId);
    setCollections(nextCollections);
  }

  if (initialLoading) {
    return <ActivityIndicator style={styles.loader} color={colors.primary} />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved</Text>
          <Text style={styles.subtitle}>All imported social posts, clips, and source material.</Text>
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

      <View style={styles.collectionsCard}>
        <View style={styles.collectionsHeader}>
          <View style={styles.collectionsHeaderCopy}>
            <Text style={styles.sectionTitle}>Collections</Text>
            <Text style={styles.collectionsBody}>Save into curated albums you can build out over time.</Text>
          </View>
          <Pressable style={styles.collectionPlusButton} onPress={() => setShowCollectionModal(true)}>
            <Ionicons name="add" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.albumGrid}>
          <CollectionAlbumCard
            label="All posts"
            count={videos.length}
            subtitle="Everything in your source library"
            color={colors.primary}
            active={activeCollectionId === "all"}
            onPress={() => setActiveCollectionId("all")}
          />
          <CollectionAlbumCard
            label="Unassigned"
            count={videos.filter((video) => !assignedVideoIds.has(video.id)).length}
            subtitle="Posts waiting to be organized"
            color={colors.muted}
            active={activeCollectionId === "unassigned"}
            onPress={() => setActiveCollectionId("unassigned")}
          />
          {collections.map((collection) => (
            <CollectionAlbumCard
              key={collection.id}
              label={collection.name}
              count={collection.videoIds.length}
              subtitle={collection.description}
              color={collection.color}
              active={activeCollectionId === collection.id}
              onPress={() => setActiveCollectionId(collection.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.organizeCard}>
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
      </View>

      {activeCollection ? (
        <View style={styles.collectionHintCard}>
          <Text style={styles.collectionHintTitle}>{activeCollection.name} is open</Text>
          <Text style={styles.collectionHintBody}>
            Tap saved posts below to add or remove them from this collection.
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {filteredVideos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📥</Text>
          <Text style={styles.emptyTitle}>No saved content here yet</Text>
          <Text style={styles.emptyBody}>
            {activeCollection
              ? `Add posts to ${activeCollection.name} to start shaping this collection.`
              : "Add a TikTok or Instagram URL above to start building your source library."}
          </Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              collections={collections}
              activeCollection={activeCollection}
              onDelete={handleDeleteVideo}
              onToggleCollection={handleToggleCollection}
            />
          ))}
        </View>
      )}

      <Modal
        transparent
        animationType="fade"
        visible={showCollectionModal}
        onRequestClose={() => setShowCollectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCollectionModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New collection</Text>
            <Text style={styles.modalBody}>
              Create a collection to organize saved posts before collection-based generation is wired on the backend.
            </Text>
            <TextInput
              placeholder="Collection name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={collectionName}
              onChangeText={setCollectionName}
            />
            <TextInput
              placeholder="Short description"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={collectionDescription}
              onChangeText={setCollectionDescription}
            />
            <View style={styles.addActions}>
              <Pressable
                style={[
                  styles.primaryButton,
                  (!collectionName.trim() || creatingCollection) && styles.buttonDisabled,
                ]}
                onPress={handleCreateCollection}
                disabled={!collectionName.trim() || creatingCollection}
              >
                {creatingCollection ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.ghostButton}
                onPress={() => {
                  setShowCollectionModal(false);
                  setCollectionName("");
                  setCollectionDescription("");
                }}
              >
                <Text style={styles.ghostButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  quickAddIconText: { color: colors.primary, fontSize: 18, fontWeight: "700" },
  quickAddLabel: { flex: 1, color: colors.muted, fontSize: 14 },
  quickAddArrow: { color: colors.muted, fontSize: 16 },
  addCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
  },
  addActions: { flexDirection: "row", gap: 10 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
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
  ghostButtonText: { color: colors.text, fontWeight: "600" },
  collectionsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  collectionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  collectionsHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  collectionsBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  collectionPlusButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  albumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  albumCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  albumCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  albumPreview: {
    flexDirection: "row",
    gap: 6,
    aspectRatio: 1,
  },
  albumTileLarge: {
    flex: 1.2,
    borderRadius: 16,
  },
  albumPreviewColumn: {
    flex: 0.8,
    gap: 6,
  },
  albumTileSmall: {
    flex: 1,
    borderRadius: 14,
  },
  albumTitle: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  albumMeta: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  albumSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  organizeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  filterLabel: { color: colors.text, fontWeight: "600", marginTop: 4 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterChipText: { color: colors.muted, textTransform: "capitalize" },
  filterChipTextActive: { color: colors.primary, fontWeight: "700" },
  collectionHintCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: 16,
    gap: 4,
  },
  collectionHintTitle: { color: colors.text, fontWeight: "700" },
  collectionHintBody: { color: colors.muted, lineHeight: 19 },
  stack: { gap: 12 },
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
  videoMetaText: { color: colors.muted, fontSize: 12, flex: 1 },
  videoMetaActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  linkText: { color: colors.primary, fontWeight: "600" },
  iconButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  videoStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  creatorHandle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  videoTitle: { color: colors.text, fontWeight: "700", lineHeight: 21 },
  videoDescription: { color: colors.text, fontSize: 13, lineHeight: 19 },
  videoExcerpt: { color: colors.muted, fontSize: 13, lineHeight: 18, fontStyle: "italic" },
  inlineNote: { color: colors.muted, fontSize: 12 },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  themePillText: { fontSize: 12, fontWeight: "600" },
  assignedCollectionPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  assignedCollectionText: { fontSize: 12, fontWeight: "700" },
  collectionActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  collectionActionButtonActive: {
    backgroundColor: colors.surface,
  },
  collectionActionText: { color: colors.text, fontWeight: "600" },
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45, 33, 24, 0.35)",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  modalBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  buttonDisabled: { opacity: 0.6 },
});
