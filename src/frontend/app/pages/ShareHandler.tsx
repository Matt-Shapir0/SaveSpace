// src/frontend/app/pages/ShareHandler.tsx
//
// This page handles the iOS/Android Share Sheet.
// When a user shares a TikTok or Reel to EchoFeed, the OS opens:
//   https://your-app.vercel.app/share?url=https://tiktok.com/...
//
// This component catches that URL, shows a quick confirmation, saves the video,
// then redirects to the Library > Videos tab.
//
// Setup required:
//   1. manifest.json must have the share_target block (already done)
//   2. This route must be registered in routes.tsx as path="/share"
//   3. App must be installed as a PWA (Add to Home Screen) for share sheet to work

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { videosApi } from "../lib/api";
import { useUser } from "../lib/useUser";

type State = "detecting" | "saving" | "done" | "error" | "no-url";

// Extracts the actual video URL from the share payload.
// TikTok sometimes puts the URL in the `text` param as "Check out this video: https://..."
function extractUrl(params: URLSearchParams): string | null {
  // Direct URL param (clean share)
  const url = params.get("url");
  if (url && (url.includes("tiktok.com") || url.includes("instagram.com") || url.includes("youtu"))) {
    return url;
  }

  // URL embedded in the text body (TikTok does this)
  const text = params.get("text") || params.get("title") || "";
  const match = text.match(/https?:\/\/[^\s]+/);
  if (match) return match[0];

  // Fallback: return whatever URL param we got
  return url || null;
}

export function ShareHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = useUser();
  const [state, setState] = useState<State>("detecting");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = extractUrl(searchParams);

    if (!url) {
      setState("no-url");
      return;
    }

    setVideoUrl(url);

    if (!userId) {
      // Auth hasn't loaded yet — wait a beat then retry
      setTimeout(() => {
        if (!userId) navigate("/");
      }, 2000);
      return;
    }

    setState("saving");

    videosApi
      .submit(url, userId)
      .then(() => {
        setState("done");
        // Auto-redirect to Library > Videos after a short confirmation moment
        setTimeout(() => navigate("/library?tab=videos"), 1800);
      })
      .catch((e) => {
        console.error(e);
        setError("Couldn't save that video. It may be private or unsupported.");
        setState("error");
      });
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-background text-center">
      {state === "detecting" && (
        <>
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <h2 className="mb-2">Opening EchoFeed…</h2>
          <p className="text-muted-foreground text-sm">Detecting your shared link</p>
        </>
      )}

      {state === "saving" && (
        <>
          <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-5">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="mb-2">Saving to your library</h2>
          <p className="text-muted-foreground text-sm mb-4 break-all max-w-xs">
            {videoUrl}
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </>
      )}

      {state === "done" && (
        <>
          <div className="w-16 h-16 bg-green-500/10 rounded-3xl flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="mb-2">Saved!</h2>
          <p className="text-muted-foreground text-sm">
            Heading to your library…
          </p>
        </>
      )}

      {state === "error" && (
        <>
          <div className="w-16 h-16 bg-destructive/10 rounded-3xl flex items-center justify-center mb-5">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="mb-2">Couldn't save that</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate("/library?tab=videos")}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-sm"
          >
            Go to Library
          </button>
        </>
      )}

      {state === "no-url" && (
        <>
          <div className="w-16 h-16 bg-secondary rounded-3xl flex items-center justify-center mb-5">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2">No link detected</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Share a TikTok or Instagram Reel to EchoFeed to save it.
          </p>
          <button
            onClick={() => navigate("/library?tab=videos")}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-sm"
          >
            Go to Library
          </button>
        </>
      )}
    </div>
  );
}
