// Visual mode = karaoke scrolling text synced to audio position.

import { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "react-router";
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Share2, Loader2, AlertCircle } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { themeColors, type ThemeId } from "../lib/themes";
import { episodesApi, type Episode } from "../lib/api";
import { useUser } from "../lib/useUser";

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?w=1080&q=80",
  "https://images.unsplash.com/photo-1745970347554-854e886c5685?w=1080&q=80",
  "https://images.unsplash.com/photo-1761590206515-1816e5123df9?w=1080&q=80",
];

// Karaoke text component

function KaraokeView({ segments, currentTime }: {
  segments: Episode["segments"];
  currentTime: number;
}) {
  const activeIndex = segments.findLastIndex((s) => currentTime >= s.start_time);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  // Auto-scroll to keep active sentence centred
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  if (segments.length === 0) return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      No transcript available yet.
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-4 pb-8">
      {segments.map((seg, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;
        return (
          <p
            key={i}
            ref={isActive ? activeRef : undefined}
            className={`text-lg leading-relaxed transition-all duration-300 cursor-default select-none ${
              isActive
                ? "text-foreground font-medium"
                : isPast
                ? "text-muted-foreground/40"
                : "text-muted-foreground/60"
            }`}
          >
            {seg.text}
          </p>
        );
      })}
    </div>
  );
}

// Main Player
export function PodcastPlayer() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useUser();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"podcast" | "visual">("podcast");

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioReady, setAudioReady] = useState(false);

  // Poll if still generating
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id || !userId) return;
    const load = async () => {
      try {
        const data = await episodesApi.getById(id);
        setEpisode(data);
        if (data.status === "generating") {
          // Poll every 5s until done
          if (!pollRef.current) {
            pollRef.current = window.setInterval(async () => {
              const updated = await episodesApi.getById(id);
              setEpisode(updated);
              if (updated.status !== "generating") {
                clearInterval(pollRef.current!);
                pollRef.current = null;
              }
            }, 5000);
          }
        }
      } catch {
        setError("Couldn't load this episode.");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id, userId]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onCanPlay = () => setAudioReady(true);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
    };
  }, [episode?.audio_url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const skipBack = () => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 15);
  };
  const skipForward = () => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 15);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = ratio * duration;
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  // ── Loading states ───────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading episode…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col h-screen items-center justify-center gap-4 px-8 text-center">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <p className="text-sm text-muted-foreground">{error}</p>
      <Link to="/library" className="text-primary text-sm">← Back to Library</Link>
    </div>
  );

  if (!episode) return null;

  const coverImage = COVER_IMAGES[parseInt(episode.id.charCodeAt(0).toString()) % COVER_IMAGES.length] || COVER_IMAGES[0];
  const isGenerating = episode.status === "generating";
  const isFailed = episode.status === "failed";

  // ── Generating state ─────────────────────────────────────────────────────

  if (isGenerating) return (
    <div className="flex flex-col h-screen">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <Link to={from} className="text-muted-foreground"><ChevronDown className="w-6 h-6" /></Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="mb-2">Creating your episode</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Writing your script, generating audio, and getting everything ready. This takes about 30–60 seconds.
          </p>
        </div>
      </div>
    </div>
  );

  // Failed state
  if (isFailed) return (
    <div className="flex flex-col h-screen">
      <div className="px-6 pt-6 pb-4 flex items-center">
        <Link to={from} className="text-muted-foreground"><ChevronDown className="w-6 h-6" /></Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <div>
          <h2 className="mb-2">Generation failed</h2>
          <p className="text-sm text-muted-foreground">{episode.error_message || "Something went wrong."}</p>
        </div>
        <Link to="/library" className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-sm">Back to Library</Link>
      </div>
    </div>
  );

  // Full player

  return (
    <div className="flex flex-col h-screen">
      {/* Hidden audio element */}
      {episode.audio_url && (
        <audio ref={audioRef} src={episode.audio_url} preload="auto" />
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <Link to={from} className="text-muted-foreground"><ChevronDown className="w-6 h-6" /></Link>
        <h2 className="text-sm">Now Playing</h2>
        <button className="text-muted-foreground"><Share2 className="w-5 h-5" /></button>
      </div>

      {/* Mode selector */}
      <div className="px-6 mb-4 flex-shrink-0">
        <div className="flex gap-2 bg-secondary rounded-2xl p-1">
          {(["podcast", "visual"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-sm capitalize ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
        {mode === "podcast" ? (
          <div className="space-y-5">
            {/* Cover */}
            <div className="aspect-square rounded-3xl overflow-hidden bg-secondary shadow-lg">
              <ImageWithFallback src={coverImage} alt={episode.title} className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl">{episode.title}</h1>
              <p className="text-muted-foreground text-sm">
                {new Date(episode.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {episode.themes.map((t) => (
                  <span key={t} className={`text-xs ${themeColors[t as ThemeId]?.bg} ${themeColors[t as ThemeId]?.border} border px-3 py-1 rounded-full`}>
                    {themeColors[t as ThemeId]?.icon} {themeColors[t as ThemeId]?.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Script / description */}
            {episode.script && (
              <div className="bg-card rounded-2xl p-4 border border-border/50">
                <h3 className="mb-2 text-sm">Episode script</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                  {episode.script}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Visual / karaoke mode */
          <KaraokeView segments={episode.segments || []} currentTime={currentTime} />
        )}
      </div>

      {/* Player controls */}
      <div className="px-6 py-5 bg-card border-t border-border/50 flex-shrink-0">
        {/* Scrubber */}
        <div className="mb-4">
          <div
            className="h-2 bg-secondary rounded-full overflow-hidden cursor-pointer"
            onClick={handleProgressClick}
          >
            <div className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || (episode.audio_duration || 0))}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-8">
          <button onClick={skipBack} className="text-muted-foreground hover:text-foreground transition-colors flex flex-col items-center gap-1">
            <SkipBack className="w-7 h-7" />
            <span className="text-xs text-muted-foreground">15</span>
          </button>
          <button
            onClick={togglePlay}
            disabled={!audioReady && !isPlaying}
            className="bg-primary text-primary-foreground rounded-full p-4 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {!audioReady && episode.audio_url
              ? <Loader2 className="w-7 h-7 animate-spin" />
              : isPlaying
              ? <Pause className="w-7 h-7 fill-current" />
              : <Play className="w-7 h-7 fill-current" />
            }
          </button>
          <button onClick={skipForward} className="text-muted-foreground hover:text-foreground transition-colors flex flex-col items-center gap-1">
            <SkipForward className="w-7 h-7" />
            <span className="text-xs text-muted-foreground">15</span>
          </button>
        </div>
      </div>
    </div>
  );
}