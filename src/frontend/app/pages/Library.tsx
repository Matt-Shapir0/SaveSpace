import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Play, Calendar, Heart, ChevronRight,
  Loader2, AlertCircle, ExternalLink,
  Clock, CheckCircle2, XCircle, Headphones,
  Plus, Link2, Trash2, Sparkles, RefreshCw,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { videosApi, episodesApi, type Video, type EpisodeSummary } from "../lib/api";
import { useUser } from "../lib/useUser";
import { themeColors, type ThemeId } from "../lib/themes";

type TabType = "podcasts" | "videos";

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?w=400&q=80",
  "https://images.unsplash.com/photo-1745970347554-854e886c5685?w=400&q=80",
  "https://images.unsplash.com/photo-1761590206515-1816e5123df9?w=400&q=80",
];


function StatusIcon({ status }: { status: Video["status"] }) {
  switch (status) {
    case "done":       return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "processing": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "pending":    return <Clock className="w-4 h-4 text-yellow-500" />;
    case "failed":     return <XCircle className="w-4 h-4 text-red-500" />;
  }
}

function VideoCard({ video, onDelete }: { video: Video; onDelete: (id: string) => void }) {
  const date = new Date(video.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    if (dx < 0) { e.preventDefault(); setOffsetX(Math.max(dx, -DELETE_THRESHOLD)); }
    else if (offsetX < 0) { setOffsetX(Math.min(dx + offsetX, 0)); }
  };
  const handleTouchEnd = () => {
    setOffsetX(offsetX < -(DELETE_THRESHOLD / 2) ? -DELETE_THRESHOLD : 0);
  };
  const handleDelete = async () => {
    setDeleting(true);
    try { await videosApi.deleteVideo(video.id); onDelete(video.id); }
    catch { setDeleting(false); setOffsetX(0); }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 rounded-2xl">
        <button onClick={handleDelete} disabled={deleting}
          className="flex flex-col items-center justify-center gap-1 w-full h-full">
          {deleting ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Trash2 className="w-5 h-5 text-white" />}
          <span className="text-white text-xs">Delete</span>
        </button>
      </div>
      <div
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onClick={() => offsetX < 0 && setOffsetX(0)}
        style={{ transform: `translateX(${offsetX}px)`, transition: isDragging.current ? "none" : "transform 0.25s ease" }}
        className="bg-card border border-border/50 rounded-2xl p-4 space-y-2 relative z-10"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusIcon status={video.status} />
            <span className="text-xs text-muted-foreground capitalize">{video.source || "video"}</span>
            <span className="text-xs text-muted-foreground">· {date}</span>
          </div>
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        {video.caption && <p className="text-sm line-clamp-2">{video.caption}</p>}
        {video.status === "done" && video.transcript && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">"{video.transcript.slice(0, 120)}…"</p>
        )}
        {video.theme_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {video.theme_tags.map((t) => {
              const theme = themeColors[t as ThemeId];
              if (!theme) return null;
              return <span key={t} className={`text-xs ${theme.bg} ${theme.border} border px-2 py-0.5 rounded-lg`}>{theme.icon} {theme.name}</span>;
            })}
          </div>
        )}
        {video.status === "failed" && <p className="text-xs text-destructive">Processing failed — the video may be private.</p>}
        {(video.status === "pending" || video.status === "processing") && <p className="text-xs text-muted-foreground">Extracting transcript and themes…</p>}
      </div>
    </div>
  );
}

// Theme drill-down

function ThemeDrillDown({ themeId, videos, onBack, onDelete }: {
  themeId: ThemeId; videos: Video[]; onBack: () => void; onDelete: (id: string) => void;
}) {
  const theme = themeColors[themeId];
  return (
    <div>
      <button onClick={onBack} className="text-primary mb-5 flex items-center gap-1 text-sm">← Back</button>
      <div className="flex items-center gap-3 mb-5">
        <div className={`${theme.bg} ${theme.border} border-2 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl`}>{theme.icon}</div>
        <div>
          <h2 className="text-xl">{theme.name}</h2>
          <p className="text-sm text-muted-foreground">{videos.length} video{videos.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="space-y-3 pb-28">
        {videos.map((v) => <VideoCard key={v.id} video={v} onDelete={onDelete} />)}
      </div>
    </div>
  );
}

function AddVideoInput({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!url.trim()) return;
    setSaving(true); setError(null);
    try { await videosApi.submit(url.trim(), userId); setUrl(""); setOpen(false); onAdded(); }
    catch { setError("Couldn't save that URL — check it and try again."); }
    finally { setSaving(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center gap-3 bg-secondary hover:bg-secondary/70 rounded-2xl px-4 py-3.5 transition-colors mb-5">
      <div className="bg-primary/10 rounded-xl p-1.5"><Plus className="w-4 h-4 text-primary" /></div>
      <span className="text-sm text-muted-foreground flex-1 text-left">Paste a TikTok or Reel URL…</span>
      <Link2 className="w-4 h-4 text-muted-foreground/50" />
    </button>
  );

  return (
    <div className="mb-5 space-y-2">
      <div className="flex gap-2">
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="https://www.tiktok.com/..." autoFocus
          className="flex-1 bg-card border border-border focus:border-primary/50 rounded-2xl px-4 py-3 text-sm outline-none transition-colors" />
        <button onClick={handleSave} disabled={saving || !url.trim()}
          className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 text-sm disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </button>
        <button onClick={() => { setOpen(false); setUrl(""); setError(null); }} className="text-muted-foreground px-3 text-sm">Cancel</button>
      </div>
      {error && <p className="text-xs text-destructive flex items-center gap-1.5 px-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
    </div>
  );
}

function VideosTab({ videos, loading, error, userId, onVideoAdded, onDelete }: {
  videos: Video[]; loading: boolean; error: string | null;
  userId: string; onVideoAdded: () => void; onDelete: (id: string) => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(null);
  const byTheme: Record<string, Video[]> = {};
  for (const v of videos) {
    if (v.status === "done" && v.theme_tags?.length) {
      for (const t of v.theme_tags) { if (!byTheme[t]) byTheme[t] = []; byTheme[t].push(v); }
    }
  }
  const unthemed = videos.filter((v) => v.status !== "done" || !v.theme_tags?.length);

  if (selectedTheme) return (
    <ThemeDrillDown themeId={selectedTheme} videos={byTheme[selectedTheme] ?? []}
      onBack={() => setSelectedTheme(null)} onDelete={onDelete} />
  );

  return (
    <div>
      <AddVideoInput userId={userId} onAdded={onVideoAdded} />
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-destructive text-sm py-4"><AlertCircle className="w-4 h-4" />{error}</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-28 space-y-3">
          <div className="text-5xl">📱</div>
          <p className="text-muted-foreground text-sm leading-relaxed">No saved videos yet.<br />Paste a URL above to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {Object.entries(byTheme).map(([themeId, themeVideos]) => {
            const theme = themeColors[themeId as ThemeId];
            const latest = themeVideos.find((v) => v.transcript || v.caption);
            return (
              <button key={themeId} onClick={() => setSelectedTheme(themeId as ThemeId)}
                className={`w-full text-left ${theme?.bg ?? "bg-secondary"} ${theme?.border ?? ""} border-2 rounded-3xl p-5 hover:scale-[1.01] active:scale-[0.99] transition-transform`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{theme?.icon}</div>
                    <div>
                      <h3 className="text-lg">{theme?.name ?? themeId}</h3>
                      <p className="text-xs text-muted-foreground">{themeVideos.length} video{themeVideos.length !== 1 ? "s" : ""}</p>
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
              <h3 className="text-sm text-muted-foreground mb-3 px-1">Processing · {unthemed.length} video{unthemed.length !== 1 ? "s" : ""}</h3>
              <div className="space-y-3">{unthemed.map((v) => <VideoCard key={v.id} video={v} onDelete={onDelete} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Podcasts tab

function PodcastsTab({ userId }: { userId: string }) {
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const loadEpisodes = async () => {
    try { setEpisodes(await episodesApi.listByUser(userId)); }
    catch { setError("Couldn't load episodes."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!userId) return;
    loadEpisodes();
  }, [userId]);

  // Poll while any episode is still generating
  useEffect(() => {
    const hasGenerating = episodes.some((e) => e.status === "generating");
    if (hasGenerating && !pollRef.current) {
      pollRef.current = window.setInterval(loadEpisodes, 5000);
    } else if (!hasGenerating && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [episodes]);

  const handleGenerate = async () => {
    setGenerating(true); setError(null);
    try {
      await episodesApi.generate(userId);
      await loadEpisodes();
    } catch (e: any) {
      setError(e?.message?.includes("400") ? "Save and process at least one video first." : "Generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await episodesApi.delete(id); setEpisodes((prev) => prev.filter((e) => e.id !== id)); }
    catch { setError("Couldn't delete episode."); }
  };

  const formatDuration = (secs: number | null) => {
    if (!secs) return "";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Generate button */}
      <button onClick={handleGenerate} disabled={generating}
        className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground rounded-2xl py-4 disabled:opacity-60 hover:opacity-90 transition-opacity">
        {generating
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating your episode…</>
          : <><Sparkles className="w-5 h-5" /> Generate New Episode</>
        }
      </button>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-2 bg-destructive/10 px-4 py-3 rounded-2xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : episodes.length === 0 ? (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 text-center space-y-2">
          <Headphones className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3>No episodes yet</h3>
          <p className="text-sm text-muted-foreground">Tap Generate above to create your first personalized podcast episode from your saved videos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map((ep, i) => {
            if (ep.status === "generating") return (
              <div key={ep.id} className="bg-card rounded-2xl p-4 border border-primary/20 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <div>
                  <p className="text-sm">Generating episode…</p>
                  <p className="text-xs text-muted-foreground mt-1">This takes about 30–60 seconds</p>
                </div>
              </div>
            );

            if (ep.status === "failed") return (
              <div key={ep.id} className="bg-card rounded-2xl p-4 border border-destructive/20 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-destructive">Generation failed</p>
                  <p className="text-xs text-muted-foreground mt-1">{ep.error_message?.slice(0, 80)}</p>
                </div>
                <button onClick={() => handleDelete(ep.id)} className="text-muted-foreground"><Trash2 className="w-4 h-4" /></button>
              </div>
            );

            return (
              <div key={ep.id} className="relative">
                <Link to={`/podcast/${ep.id}`}
                  className="block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all active:scale-[0.99]">
                  <div className="flex gap-4 p-4">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                      <ImageWithFallback src={COVER_IMAGES[i % COVER_IMAGES.length]} alt={ep.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="bg-primary rounded-full p-2"><Play className="w-4 h-4 text-primary-foreground fill-current" /></div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-10">
                      <h3 className="mb-1 text-base line-clamp-1">{ep.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(ep.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        {ep.audio_duration && <><span>·</span><span>{formatDuration(ep.audio_duration)}</span></>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ep.themes.slice(0, 2).map((t) => (
                          <span key={t} className={`text-xs ${themeColors[t as ThemeId]?.bg} ${themeColors[t as ThemeId]?.border} border px-2 py-0.5 rounded-lg`}>
                            {themeColors[t as ThemeId]?.icon} {themeColors[t as ThemeId]?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
                <button onClick={() => handleDelete(ep.id)}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main

export function Library() {
  const { userId } = useUser();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<TabType>(searchParams.get("tab") === "videos" ? "videos" : "podcasts");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = async () => {
    if (!userId) return;
    try { setVideos(await videosApi.getByUser(userId)); }
    catch { setError("Couldn't load your videos."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadVideos(); const iv = setInterval(loadVideos, 8000); return () => clearInterval(iv); }, [userId]);

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-4">
        <h1 className="mb-4">Your Library</h1>
        <div className="flex gap-2">
          {(["podcasts", "videos"] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm transition-all capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="px-6">
        {tab === "podcasts"
          ? <PodcastsTab userId={userId!} />
          : <VideosTab videos={videos} loading={loading} error={error} userId={userId!}
              onVideoAdded={loadVideos} onDelete={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))} />
        }
      </div>
    </div>
  );
}