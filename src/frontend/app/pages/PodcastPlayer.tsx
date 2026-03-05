import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Eye,
  Share2,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { themeColors, type ThemeId } from "../lib/themes";

const mockPodcast = {
  id: "1",
  title: "Your Weekly Reinforcement",
  date: "Mar 1, 2026",
  duration: 1080, // seconds
  themes: ["growth", "selfcare"] as ThemeId[],
  coverImage: "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBsaXN0ZW5pbmclMjBoZWFkcGhvbmVzJTIwY2FsbXxlbnwxfHx8fDE3NzIzOTYxOTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
  description:
    "This week's episode draws from 12 posts you saved about building resilience and self-compassion. We'll explore how to be gentle with yourself while still pursuing growth.",
  keyPoints: [
    {
      time: "2:15",
      content: "Growth happens in discomfort - from your saved post by @motivation_daily",
    },
    {
      time: "8:42",
      content: "The importance of self-compassion during setbacks",
    },
    {
      time: "14:20",
      content: "Building consistency through small daily actions",
    },
  ],
};

export function PodcastPlayer() {
  const { id } = useParams();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeMode, setActiveMode] = useState<"podcast" | "visual">("podcast");
  const progressInterval = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= mockPodcast.duration) {
            setIsPlaying(false);
            return mockPodcast.duration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSkipBack = () => {
    setCurrentTime((prev) => Math.max(0, prev - 15));
  };

  const handleSkipForward = () => {
    setCurrentTime((prev) => Math.min(mockPodcast.duration, prev + 15));
  };

  const progress = (currentTime / mockPodcast.duration) * 100;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <Link to={from} className="text-muted-foreground">
          <ChevronDown className="w-6 h-6" />
        </Link>
        <h2 className="text-sm">Now Playing</h2>
        <button className="text-muted-foreground">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="px-6 mb-6">
        <div className="flex gap-2 bg-secondary rounded-2xl p-1">
          <button
            onClick={() => setActiveMode("podcast")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all text-sm ${
              activeMode === "podcast"
                ? "bg-card shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Podcast
          </button>
          <button
            onClick={() => setActiveMode("visual")}
            className={`flex-1 py-2 px-3 rounded-xl transition-all text-sm ${
              activeMode === "visual"
                ? "bg-card shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Visual
          </button>
        </div>
      </div>

      {/* Content based on mode */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {activeMode === "podcast" && (
          <div className="space-y-6">
            {/* Cover Image */}
            <div className="aspect-square rounded-3xl overflow-hidden bg-secondary shadow-lg">
              <ImageWithFallback 
                src={mockPodcast.coverImage}
                alt={mockPodcast.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl">{mockPodcast.title}</h1>
              <p className="text-muted-foreground">{mockPodcast.date}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {mockPodcast.themes.map((themeId) => (
                  <span
                    key={themeId}
                    className={`text-xs ${themeColors[themeId].bg} ${themeColors[themeId].border} border px-3 py-1 rounded-full`}
                  >
                    {themeColors[themeId].icon} {themeColors[themeId].name}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-card rounded-2xl p-4 border border-border/50">
              <h3 className="mb-2 text-sm">About this episode</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {mockPodcast.description}
              </p>
            </div>

            {/* Key Points */}
            <div>
              <h3 className="mb-3 text-sm">Key Points</h3>
              <div className="space-y-2">
                {mockPodcast.keyPoints.map((point, index) => (
                  <div
                    key={index}
                    className="bg-card rounded-2xl p-4 border border-border/50 flex gap-3"
                  >
                    <div className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs h-fit">
                      {point.time}
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">
                      {point.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeMode === "visual" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-accent/50 via-accent/30 to-transparent rounded-3xl p-6 border border-border text-center">
              <Eye className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="mb-2">Visual Mode</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Experience your saved content as an animated visual journey with key quotes and themes.
              </p>
              <button className="bg-primary text-primary-foreground py-3 px-6 rounded-2xl">
                Watch Visualization
              </button>
            </div>

            {/* Visual preview mockup */}
            <div className="grid grid-cols-2 gap-3">
              {mockPodcast.keyPoints.map((point, index) => (
                <div
                  key={index}
                  className="aspect-square bg-gradient-to-br from-primary/20 to-transparent rounded-2xl p-4 flex items-center justify-center border border-border/50"
                >
                  <p className="text-center text-sm">{point.content.split("-")[0]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Player Controls */}
      <div className="px-6 py-6 bg-card border-t border-border/50">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(mockPodcast.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleSkipBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="w-7 h-7" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-primary text-primary-foreground rounded-full p-4 hover:opacity-90 transition-opacity"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current" />
            )}
          </button>

          <button
            onClick={handleSkipForward}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}