import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Loader2, AlertCircle, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react";
import { videosApi, type Video } from "../lib/api";
import { useUser } from "../lib/useUser";
import { themeColors, type ThemeId } from "../lib/themes";

type ViewType = "timeline" | "themes";

function StatusIcon({ status }: { status: Video["status"] }) {
  switch (status) {
    case "done": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "processing": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
    case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
  }
}

function VideoCard({ video }: { video: Video }) {
  const date = new Date(video.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-2">
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
      {video.theme_tags && video.theme_tags.length > 0 && (
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
      {video.status === "failed" && <p className="text-xs text-destructive">Processing failed — the video may be private.</p>}
      {(video.status === "pending" || video.status === "processing") && (
        <p className="text-xs text-muted-foreground">Extracting transcript and themes…</p>
      )}
    </div>
  );
}

export function Library() {
  const { userId } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewType, setViewType] = useState<ViewType>(searchParams.get("tab") === "themes" ? "themes" : "timeline");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      try { setVideos(await videosApi.getByUser(userId)); }
      catch { setError("Couldn't load your library."); }
      finally { setLoading(false); }
    };
    fetch();
    const interval = setInterval(fetch, 8000);
    return () => clearInterval(interval);
  }, [userId]);

  const byTheme: Record<string, Video[]> = {};
  for (const video of videos) {
    if (video.status === "done" && video.theme_tags?.length) {
      for (const t of video.theme_tags) {
        if (!byTheme[t]) byTheme[t] = [];
        byTheme[t].push(video);
      }
    }
  }
  const unthemed = videos.filter((v) => v.status !== "done" || !v.theme_tags?.length);

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-4">
        <h1 className="mb-4">Your Library</h1>
        <div className="flex gap-2">
          {(["timeline", "themes"] as ViewType[]).map((t) => (
            <button key={t} onClick={() => { setViewType(t); setSearchParams(t === "themes" ? { tab: "themes" } : {}); }}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm transition-all capitalize ${viewType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="px-6 pb-8">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive text-sm py-6"><AlertCircle className="w-4 h-4" />{error}</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 space-y-3"><div className="text-5xl">📚</div><p className="text-muted-foreground text-sm">Your library is empty. Save your first video from the Home tab.</p></div>
        ) : viewType === "timeline" ? (
          <div className="space-y-3">{videos.map((v) => <VideoCard key={v.id} video={v} />)}</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byTheme).map(([themeId, themeVideos]) => {
              const theme = themeColors[themeId as ThemeId];
              return (
                <div key={themeId}>
                  <div className={`flex items-center gap-2 mb-3 ${theme?.bg ?? "bg-secondary"} ${theme?.border ?? ""} border rounded-2xl px-4 py-2`}>
                    <span className="text-lg">{theme?.icon}</span>
                    <h3 className="text-sm font-medium">{theme?.name ?? themeId}</h3>
                    <span className="text-xs text-muted-foreground ml-auto">{themeVideos.length} video{themeVideos.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-3">{themeVideos.map((v) => <VideoCard key={v.id} video={v} />)}</div>
                </div>
              );
            })}
            {unthemed.length > 0 && (
              <div>
                <h3 className="text-sm text-muted-foreground mb-3">Processing · {unthemed.length} video{unthemed.length !== 1 ? "s" : ""}</h3>
                <div className="space-y-3">{unthemed.map((v) => <VideoCard key={v.id} video={v} />)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
