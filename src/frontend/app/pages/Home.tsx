// src/frontend/app/pages/Home.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { videosApi, type Video } from "../lib/api";
import { useUser } from "../lib/useUser";

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?w=400&q=80",
  "https://images.unsplash.com/photo-1745970347554-854e886c5685?w=400&q=80",
  "https://images.unsplash.com/photo-1761590206515-1816e5123df9?w=400&q=80",
];

function getGreeting(firstName?: string | null) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${time}, ${firstName}!` : `${time}!`;
}

export function Home() {
  const { userId } = useUser();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const firstName = userId ? localStorage.getItem(`echofeed_name_${userId}`) : null;

  const fetchVideos = async () => {
    if (!userId) return;
    try { setVideos(await videosApi.getByUser(userId)); }
    catch { setError("Couldn't load your saved videos."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 8000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleSubmit = async () => {
    if (!submitUrl.trim() || !userId) return;
    setSubmitting(true); setError(null);
    try {
      await videosApi.submit(submitUrl.trim(), userId);
      setSubmitUrl(""); setShowInput(false);
      await fetchVideos();
    } catch { setError("Couldn't save that URL. Check it and try again."); }
    finally { setSubmitting(false); }
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const processed = videos.filter((v) => v.status === "done").length;

  return (
    <div className="min-h-screen">
      <div className="relative h-56 overflow-hidden">
        <ImageWithFallback src={COVER_IMAGES[0]} alt="Morning" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl mb-1 text-foreground">{getGreeting(firstName)}</h1>
          <p className="text-foreground/80 text-sm">{today}</p>
        </div>
      </div>

      <div className="px-6 pt-6 pb-2">
        {showInput ? (
          <div className="flex gap-2">
            <input type="url" value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Paste a TikTok or Reel URL…" autoFocus
              className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/20" />
            <button onClick={handleSubmit} disabled={submitting || !submitUrl.trim()}
              className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 text-sm disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </button>
            <button onClick={() => setShowInput(false)} className="text-muted-foreground px-3 text-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowInput(true)}
            className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-2xl px-5 py-4 transition-colors">
            <div className="bg-primary rounded-full p-1"><Plus className="w-4 h-4 text-primary-foreground" /></div>
            <span className="text-sm text-primary">Save a TikTok or Reel URL</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 bg-destructive/10 text-destructive rounded-2xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {videos.length > 0 && (
        <div className="px-6 py-4">
          <div className="bg-card rounded-3xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3>Your Library</h3>
            </div>
            <p className="text-sm text-muted-foreground">{processed} of {videos.length} videos processed</p>
            {processed > 0 && <Link to="/insights" className="text-sm text-primary mt-2 block">View your insights →</Link>}
          </div>
        </div>
      )}

      <div className="px-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2>Saved Videos</h2>
          <Link to="/library" className="text-sm text-primary">View all</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="text-4xl">🎬</div>
            <p className="text-muted-foreground text-sm">No saved videos yet. Paste a TikTok or Reel URL above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.slice(0, 8).map((video, i) => (
              <div key={video.id} className="bg-card rounded-3xl overflow-hidden border border-border/50">
                <div className="flex gap-4 p-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                    <ImageWithFallback src={COVER_IMAGES[i % COVER_IMAGES.length]} alt="video" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground capitalize">{video.status} · {video.source || "video"}</span>
                    </div>
                    <p className="text-sm line-clamp-2 text-muted-foreground">{video.caption || video.url}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
