import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { LoadingScreen } from "@/src/components/loading-screen";
import { Screen } from "@/src/components/screen";
import { episodesApi, type Episode } from "@/src/lib/api";
import { colors, themeColors, type ThemeId } from "@/src/lib/theme";

const POLL_INTERVAL_MS = 5000;

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?w=1080&q=80",
  "https://images.unsplash.com/photo-1745970347554-854e886c5685?w=1080&q=80",
  "https://images.unsplash.com/photo-1761590206515-1816e5123df9?w=1080&q=80",
];

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function scaleSegments(segments: Episode["segments"], audioDuration: number) {
  if (!segments.length) {
    return [];
  }

  const estimatedTotal = segments[segments.length - 1]?.end_time || 1;
  const scale = audioDuration > 0 ? audioDuration / estimatedTotal : 1;

  return segments.map((segment) => ({
    ...segment,
    start_time: segment.start_time * scale,
    end_time: segment.end_time * scale,
  }));
}

function getActiveSegmentIndex(segments: Episode["segments"], currentTime: number) {
  if (!segments.length) {
    return -1;
  }

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (currentTime >= segments[index].start_time) {
      return index;
    }
  }

  return -1;
}

function TranscriptSegment({
  segment,
  isActive,
  isPast,
  onPress,
}: {
  segment: Episode["segments"][number];
  isActive: boolean;
  isPast: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.transcriptLine} onPress={onPress}>
      <Text
        style={[
          styles.transcriptText,
          isPast && styles.transcriptTextPast,
          isActive && styles.transcriptTextActive,
        ]}
      >
        {segment.text}
      </Text>
    </Pressable>
  );
}

export default function PodcastScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const player = useAudioPlayer(undefined, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    async function loadEpisode({ silent = false }: { silent?: boolean } = {}) {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const nextEpisode = await episodesApi.getById(params.id);
        setEpisode(nextEpisode);
        setError(null);
      } catch {
        setError("Could not load this episode.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }

    loadEpisode();
  }, [params.id]);

  useEffect(() => {
    if (!episode?.audio_url) {
      player.pause();
      return;
    }

    player.replace(episode.audio_url);
    player.pause();
    player.seekTo(0).catch(() => {});
  }, [episode?.audio_url, player]);

  useEffect(() => {
    if (episode?.status !== "generating" || !params.id) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const nextEpisode = await episodesApi.getById(params.id);
        setEpisode(nextEpisode);
      } catch {
        setError("Could not refresh this episode.");
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [episode?.status, params.id]);

  const duration = status.duration || episode?.audio_duration || 0;
  const progress = duration > 0 ? Math.min(status.currentTime / duration, 1) : 0;
  const scaledSegments = useMemo(
    () => scaleSegments(episode?.segments ?? [], duration),
    [duration, episode?.segments]
  );
  const activeSegmentIndex = useMemo(
    () => getActiveSegmentIndex(scaledSegments, status.currentTime),
    [scaledSegments, status.currentTime]
  );

  function togglePlayback() {
    if (!episode?.audio_url || !status.isLoaded) {
      return;
    }

    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  function skipBy(seconds: number) {
    if (!duration) {
      return;
    }

    const nextTime = Math.max(0, Math.min(duration, status.currentTime + seconds));
    player.seekTo(nextTime).catch(() => {});
  }

  function handleProgressPress(event: GestureResponderEvent) {
    if (!duration || !progressWidth) {
      return;
    }

    const ratio = event.nativeEvent.locationX / progressWidth;
    const nextTime = Math.max(0, Math.min(duration, ratio * duration));
    player.seekTo(nextTime).catch(() => {});
  }

  if (loading) {
    return <LoadingScreen label="Loading episode..." />;
  }

  return (
    <Screen>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>

      {error || !episode ? (
        <View style={styles.card}>
          <Text style={styles.error}>{error || "Episode not found."}</Text>
        </View>
      ) : episode.status === "generating" ? (
        <View style={styles.generatingCard}>
          <View style={styles.generatingBadge}>
            <ActivityIndicator color={colors.primary} />
          </View>
          <Text style={styles.generatingTitle}>Creating your episode</Text>
          <Text style={styles.generatingSubtitle}>
            Writing, generating audio, and getting everything ready. This updates automatically.
          </Text>
          {refreshing ? <Text style={styles.refreshText}>Refreshing status...</Text> : null}
        </View>
      ) : episode.status === "failed" ? (
        <View style={styles.card}>
          <Text style={styles.errorTitle}>Generation failed</Text>
          <Text style={styles.body}>
            {episode.error_message || "Something went wrong while generating this episode."}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{episode.title}</Text>
            <Text style={styles.subtitle}>
              {new Date(episode.created_at).toLocaleDateString("en-US")} · {formatTime(duration)}
            </Text>
          </View>

          <View style={styles.tagRow}>
            {(episode.themes ?? []).map((themeId) => {
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

          <View style={styles.playerCard}>
            <View style={styles.coverArt}>
              <Text style={styles.coverArtText}>🎧</Text>
            </View>

            <Pressable
              style={styles.progressTrack}
              onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
              onPress={handleProgressPress}
            >
              <View style={styles.progressBackground} />
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </Pressable>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(status.currentTime)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controlsRow}>
              <Pressable style={styles.secondaryControl} onPress={() => skipBy(-15)}>
                <Ionicons name="play-back" size={22} color={colors.text} />
                <Text style={styles.secondaryControlText}>15</Text>
              </Pressable>
              <Pressable
                style={[styles.playButton, (!episode.audio_url || !status.isLoaded) && styles.buttonDisabled]}
                onPress={togglePlayback}
                disabled={!episode.audio_url || !status.isLoaded}
              >
                {status.isBuffering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons
                    name={status.playing ? "pause" : "play"}
                    size={28}
                    color="#fff"
                    style={status.playing ? undefined : styles.playIcon}
                  />
                )}
              </Pressable>
              <Pressable style={styles.secondaryControl} onPress={() => skipBy(15)}>
                <Ionicons name="play-forward" size={22} color={colors.text} />
                <Text style={styles.secondaryControlText}>15</Text>
              </Pressable>
            </View>

            {!episode.audio_url ? (
              <Text style={styles.inlineNote}>This episode does not have an audio URL yet.</Text>
            ) : null}
          </View>

          {scaledSegments.length ? (
            <View style={styles.transcriptSection}>
              <Text style={styles.sectionTitle}>Transcript</Text>
              <Text style={styles.transcriptHint}>
                Tap any line to jump playback. The active line highlights word by word as the audio plays.
              </Text>
              <View style={styles.transcriptStack}>
                {scaledSegments.map((segment, index) => (
                  <TranscriptSegment
                    key={`${segment.start_time}-${index}`}
                    segment={segment}
                    isActive={index === activeSegmentIndex}
                    isPast={index < activeSegmentIndex}
                    onPress={() => player.seekTo(segment.start_time).catch(() => {})}
                  />
                ))}
              </View>
            </View>
          ) : episode.script ? (
            <View style={styles.transcriptSection}>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    backgroundColor: "#fff",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  playerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 28,
    padding: 18,
    gap: 14,
  },
  coverArt: {
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  coverArtText: {
    fontSize: 64,
  },
  progressTrack: {
    height: 18,
    justifyContent: "center",
  },
  progressBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    color: colors.muted,
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  secondaryControl: {
    width: 58,
    height: 58,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  secondaryControlText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 11,
  },
  playButton: {
    width: 76,
    height: 76,
    backgroundColor: colors.primary,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    marginLeft: 4,
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
  inlineNote: {
    color: colors.muted,
    fontSize: 12,
  },
  transcriptSection: {
    gap: 10,
    paddingTop: 6,
  },
  transcriptHint: {
    color: colors.muted,
    lineHeight: 20,
  },
  transcriptStack: {
    gap: 12,
  },
  transcriptLine: {
    paddingVertical: 2,
  },
  transcriptText: {
    fontSize: 18,
    lineHeight: 31,
    letterSpacing: -0.2,
    color: `${colors.muted}99`,
  },
  transcriptTextPast: {
    color: `${colors.muted}99`,
  },
  transcriptTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  generatingCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  generatingBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  generatingTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  generatingSubtitle: {
    color: colors.muted,
    lineHeight: 22,
    textAlign: "center",
  },
  refreshText: {
    color: colors.primary,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
