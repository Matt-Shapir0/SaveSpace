// Shows real saved videos from the backend.
// The "Themes" tab groups by detected theme tags once those are implemented;
// for now it shows all videos. "Timeline" shows chronological order.

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Loader2, AlertCircle, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react";
import { videosApi, type Video } from "../lib/api";
import { useUser } from "../lib/useUser";

type ViewType = "timeline" | "themes";

function StatusIcon({ status }: { status: Video["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
  }
}

function VideoCard({ video }: { video: Video }) {
  const date = new Date(video.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-card rounded-2xl p-4 border border-border/50 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={video.status} />
          <span className="text-xs text-muted-foreground capitalize flex-shrink-0">
            {video.source || "video"}
          </span>
          <span className="text-xs text-muted-foreground">· {date}</span>
        </div>
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {video.caption && (
        <p className="text-sm line-clamp-2">{video.caption}</p>
      )}

      {video.status === "done" && video.transcript && (
        <p className="text-xs text-muted-foreground italic line-clamp-2">
          "{video.transcript.slice(0, 120)}…"
        </p>
      )}

      {video.status === "failed" && (
        <p className="text-xs text-destructive">
          Processing failed — the video may be private or unavailable.
        </p>
      )}

      {(video.status === "pending" || video.status === "processing") && (
        <p className="text-xs text-muted-foreground">
          Extracting transcript and themes…
        </p>
      )}
    </div>
  );
}

export function Library() {
  const { userId } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewType, setViewType] = useState<ViewType>(
    searchParams.get("tab") === "themes" ? "themes" : "timeline"
  );
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const data = await videosApi.getByUser(userId);
        setVideos(data);
      } catch {
        setError("Couldn't load your library.");
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
    const interval = setInterval(fetchVideos, 8000);
    return () => clearInterval(interval);
  }, [userId]);

  // Group by detected source (tiktok / instagram / youtube / etc.)
  const bySource = videos.reduce<Record<string, Video[]>>((acc, v) => {
    const key = v.source || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-6 pb-4">
        <h1 className="mb-4">Your Library</h1>

        <div className="flex gap-2">
          {(["timeline", "themes"] as ViewType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setViewType(t);
                setSearchParams(t === "themes" ? { tab: "themes" } : {});
              }}
              className={`flex-1 py-3 px-4 rounded-2xl text-sm transition-all capitalize ${
                viewType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive text-sm py-6">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">📚</div>
            <p className="text-muted-foreground text-sm">
              Your library is empty. Save your first video from the Home tab.
            </p>
          </div>
        ) : viewType === "timeline" ? (
          <div className="space-y-3">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          // Themes view — grouped by source for now
          // Will group by AI-extracted theme tags once embeddings are implemented
          <div className="space-y-6">
            {Object.entries(bySource).map(([source, sourceVideos]) => (
              <div key={source}>
                <h3 className="text-sm text-muted-foreground capitalize mb-3">
                  {source} · {sourceVideos.length} video{sourceVideos.length !== 1 ? "s" : ""}
                </h3>
                <div className="space-y-3">
                  {sourceVideos.map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
