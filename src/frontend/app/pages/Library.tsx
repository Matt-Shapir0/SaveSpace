import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Play, Calendar, Heart, ChevronRight,
  Loader2, AlertCircle, ExternalLink,
  Clock, CheckCircle2, XCircle, Headphones,
  Plus, Link2, Trash2,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { videosApi, type Video } from "../lib/api";
import { useUser } from "../lib/useUser";
import { themeColors, type ThemeId } from "../lib/themes";

type TabType = "podcasts" | "videos";

const SAMPLE_EPISODES = [
  {
    id: "sample-1",
    title: "Your Weekly Reinforcement",
    date: "Mar 1, 2026",
    duration: "18 min",
    coverImage: "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?w=400&q=80",
    themes: ["growth", "selfcare"] as ThemeId[],
  },
  {
    id: "sample-2",
    title: "Finding Your Motivation",
    date: "Feb 23, 2026",
    duration: "22 min",
    coverImage: "https://images.unsplash.com/photo-1745970347554-854e886c5685?w=400&q=80",
    themes: ["motivation", "confidence"] as ThemeId[],
  },
];

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: Video["status"] }) {
  switch (status) {
    case "done":       return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "processing": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "pending":    return <Clock className="w-4 h-4 text-yellow-500" />;
    case "failed":     return <XCircle className="w-4 h-4 text-red-500" />;
  }
}

// ── Swipeable Video Card ──────────────────────────────────────────────────────

function VideoCard({ video, onDelete }: {
  video: Video;
  onDelete: (id: string) => void;
}) {
  const date = new Date(video.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  const [offsetX, setOffsetX] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const DELETE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!isDragging.current && Math.abs(dy) > Math.abs(dx)) return;
    isDragging.current = true;
    if (dx < 0) {
      e.preventDefault();
      setOffsetX(Math.max(dx, -DELETE_THRESHOLD));
    } else if (offsetX < 0) {
      setOffsetX(Math.min(dx + offsetX, 0));
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < -(DELETE_THRESHOLD / 2)) {
      setOffsetX(-DELETE_THRESHOLD);
    } else {
      setOffsetX(0);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await videosApi.deleteVideo(video.id);
      onDelete(video.id);
    } catch {
      setDeleting(false);
      setOffsetX(0);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Red delete button behind the card */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 rounded-2xl">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex flex-col items-center justify-center gap-1 w-full h-full"
        >
          {deleting
            ? <Loader2 className="w-5 h-5 text-white animate-spin" />
            : <Trash2 className="w-5 h-5 text-white" />
          }
          <span className="text-white text-xs">Delete</span>
        </button>
      </div>

      {/* Card — slides left to reveal delete button */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => offsetX < 0 && setOffsetX(0)}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging.current ? "none" : "transform 0.25s ease",
        }}
        className="bg-card border border-border/50 rounded-2xl p-4 space-y-2 relative z-10"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon status={video.status} />
            <span className="text-xs text-muted-foreground capitalize">{video.source || "video"}</span>
            <span className="text-xs text-muted-foreground">· {date}</span>
          </div>
          <a href={video.url} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        {video.caption && <p className="text-sm line-clamp-2">{video.caption}</p>}
        {video.status === "done" && video.transcript && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">
            "{video.transcript.slice(0, 120)}…"
          </p>
        )}
        {video.theme_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {video.theme_tags.map((t) => {
              const theme = themeColors[t as ThemeId];
              if (!theme) return null;
              return (
                <span key={t} className={`text-xs ${theme.bg} ${theme.border} border px-2 py-0.5 rounded-lg`}>
                  {theme.icon} {theme.name}
                </span>
              );
            })}
          </div>
        )}
        {video.status === "failed" && (
          <p className="text-xs text-destructive">Processing failed — the video may be private.</p>
        )}
        {(video.status === "pending" || video.status === "processing") && (
          <p className="text-xs text-muted-foreground">Extracting transcript and themes…</p>
        )}
      </div>
    </div>
  );
}

// ── Theme drill-down ──────────────────────────────────────────────────────────

function ThemeDrillDown({ themeId, videos, onBack, onDelete }: {
  themeId: ThemeId;
  videos: Video[];
  onBack: () => void;
  onDelete: (id: string) => void;
}) {
  const theme = themeColors[themeId];
  return (
    <div>
      <button onClick={onBack} className="text-primary mb-5 flex items-center gap-1 text-sm">
        ← Back
      </button>
      <div className="flex items-center gap-3 mb-5">
        <div className={`${theme.bg} ${theme.border} border-2 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl`}>
          {theme.icon}
        </div>
        <div>
          <h2 className="text-xl">{theme.name}</h2>
          <p className="text-sm text-muted-foreground">
            {videos.length} video{videos.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="space-y-3 pb-8">
        {videos.map((v) => (
          <VideoCard key={v.id} video={v} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ── Add Video input ───────────────────────────────────────────────────────────

function AddVideoInput({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await videosApi.submit(url.trim(), userId);
      setUrl("");
      setOpen(false);
      onAdded();
    } catch {
      setError("Couldn't save that URL — check it and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-secondary hover:bg-secondary/70 rounded-2xl px-4 py-3.5 transition-colors mb-5"
      >
        <div className="bg-primary/10 rounded-xl p-1.5">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground flex-1 text-left">Paste a TikTok or Reel URL…</span>
        <Link2 className="w-4 h-4 text-muted-foreground/50" />
      </button>
    );
  }

  return (
    <div className="mb-5 space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="https://www.tiktok.com/..."
          autoFocus
          className="flex-1 bg-card border border-border focus:border-primary/50 rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={saving || !url.trim()}
          className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </button>
        <button
          onClick={() => { setOpen(false); setUrl(""); setError(null); }}
          className="text-muted-foreground px-3 text-sm"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5 px-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
      {/* <p className="text-xs text-muted-foreground px-1">
        💡 Once EchoFeed is on your home screen, share directly from TikTok or Instagram — no pasting needed.
      </p> */}
    </div>
  );
}

// ── Videos tab ────────────────────────────────────────────────────────────────

function VideosTab({ videos, loading, error, userId, onVideoAdded, onDelete }: {
  videos: Video[];
  loading: boolean;
  error: string | null;
  userId: string;
  onVideoAdded: () => void;
  onDelete: (id: string) => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(null);

  const byTheme: Record<string, Video[]> = {};
  for (const v of videos) {
    if (v.status === "done" && v.theme_tags?.length) {
      for (const t of v.theme_tags) {
        if (!byTheme[t]) byTheme[t] = [];
        byTheme[t].push(v);
      }
    }
  }
  const unthemed = videos.filter((v) => v.status !== "done" || !v.theme_tags?.length);

  if (selectedTheme) {
    return (
      <ThemeDrillDown
        themeId={selectedTheme}
        videos={byTheme[selectedTheme] ?? []}
        onBack={() => setSelectedTheme(null)}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div>
      <AddVideoInput userId={userId} onAdded={onVideoAdded} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-destructive text-sm py-4">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="text-5xl">📱</div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No saved videos yet.<br />Paste a URL above, or share directly from TikTok or Instagram once EchoFeed is on your home screen.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {Object.entries(byTheme).map(([themeId, themeVideos]) => {
            const theme = themeColors[themeId as ThemeId];
            const latest = themeVideos.find((v) => v.transcript || v.caption);
            return (
              <button
                key={themeId}
                onClick={() => setSelectedTheme(themeId as ThemeId)}
                className={`w-full text-left ${theme?.bg ?? "bg-secondary"} ${theme?.border ?? ""} border-2 rounded-3xl p-5 hover:scale-[1.01] active:scale-[0.99] transition-transform`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{theme?.icon}</div>
                    <div>
                      <h3 className="text-lg">{theme?.name ?? themeId}</h3>
                      <p className="text-xs text-muted-foreground">
                        {themeVideos.length} video{themeVideos.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                {latest && (latest.transcript || latest.caption) && (
                  <div className="bg-card/50 rounded-2xl p-3 border border-border/30">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      Latest: "{(latest.transcript || latest.caption)?.slice(0, 100)}…"
                    </p>
                  </div>
                )}
              </button>
            );
          })}

          {unthemed.length > 0 && (
            <div>
              <h3 className="text-sm text-muted-foreground mb-3 px-1">
                Processing · {unthemed.length} video{unthemed.length !== 1 ? "s" : ""}
              </h3>
              <div className="space-y-3">
                {unthemed.map((v) => (
                  <VideoCard key={v.id} video={v} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Podcasts tab ──────────────────────────────────────────────────────────────

function PodcastsTab() {
  const [favorites, setFavorites] = useState(new Set(["sample-1"]));
  const toggleFav = (id: string) =>
    setFavorites((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-5 pb-8">
      <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 flex gap-4 items-start">
        <div className="bg-primary/10 p-2.5 rounded-2xl flex-shrink-0">
          <Headphones className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="mb-1">Podcasts are coming</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Once you've saved enough videos, EchoFeed will generate a personalized audio episode from your content. The samples below show what yours will look like.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground px-2">Sample Episodes</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-3">
          {SAMPLE_EPISODES.map((ep) => (
            <div key={ep.id} className="relative">
              <Link
                to={`/podcast/${ep.id}`}
                className="block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all active:scale-[0.99] opacity-80"
              >
                <div className="flex gap-4 p-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                    <ImageWithFallback src={ep.coverImage} alt={ep.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="bg-primary rounded-full p-2">
                        <Play className="w-4 h-4 text-primary-foreground fill-current" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="mb-1 text-base">{ep.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{ep.date} · {ep.duration}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ep.themes.slice(0, 2).map((t) => (
                        <span key={t} className={`text-xs ${themeColors[t]?.bg} ${themeColors[t]?.border} border px-2 py-0.5 rounded-lg`}>
                          {themeColors[t]?.icon} {themeColors[t]?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => toggleFav(ep.id)}
                className="absolute top-4 right-4 p-2 hover:scale-110 transition-transform"
              >
                <Heart className={`w-5 h-5 ${favorites.has(ep.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Library ──────────────────────────────────────────────────────────────

export function Library() {
  const { userId } = useUser();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<TabType>(
    searchParams.get("tab") === "videos" ? "videos" : "podcasts"
  );
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = async () => {
    if (!userId) return;
    try { setVideos(await videosApi.getByUser(userId)); }
    catch { setError("Couldn't load your videos."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadVideos();
    const iv = setInterval(loadVideos, 8000);
    return () => clearInterval(iv);
  }, [userId]);

  // Instant optimistic removal — no waiting for the next poll
  const handleDelete = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-4">
        <h1 className="mb-4">Your Library</h1>
        <div className="flex gap-2">
          {(["podcasts", "videos"] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm transition-all capitalize ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6">
        {tab === "podcasts" ? (
          <PodcastsTab />
        ) : (
          <VideosTab
            videos={videos}
            loading={loading}
            error={error}
            userId={userId!}
            onVideoAdded={loadVideos}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}