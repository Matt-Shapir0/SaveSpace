import { Link } from "react-router";
import { Play, Calendar, Sparkles, TrendingUp } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { themeColors, type ThemeId } from "../lib/themes";

const mockPodcasts = [
  {
    id: "1",
    title: "Your Weekly Reinforcement",
    date: "Mar 1, 2026",
    duration: "18 min",
    themes: ["growth", "selfcare"] as ThemeId[],
    coverImage: "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBsaXN0ZW5pbmclMjBoZWFkcGhvbmVzJTIwY2FsbXxlbnwxfHx8fDE3NzIzOTYxOTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    excerpt: "This week's episode draws from 12 posts you saved about building resilience and self-compassion.",
  },
  {
    id: "2",
    title: "Finding Your Motivation",
    date: "Feb 23, 2026",
    duration: "22 min",
    themes: ["motivation", "confidence"] as ThemeId[],
    coverImage: "https://images.unsplash.com/photo-1745970347554-854e886c5685?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm93dGglMjBtaW5kc2V0JTIwcGxhbnRzfGVufDF8fHx8MTc3MjM5NjE5NHww&ixlib=rb-4.1.0&q=80&w=1080",
    excerpt: "Built from insights you saved about staying consistent with your goals.",
  },
];

const todaysFeatured = {
  id: "daily",
  title: "Today's Focus: Building Resilience",
  description: "Based on your interests in personal growth and mindfulness",
  duration: "12 min",
  coverImage: "https://images.unsplash.com/photo-1745970347554-854e886c5685?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm93dGglMjBtaW5kc2V0JTIwcGxhbnRzfGVufDF8fHx8MTc3MjM5NjE5NHww&ixlib=rb-4.1.0&q=80&w=1080",
  themes: ["growth", "mindfulness"] as ThemeId[],
};

export function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden">
        <ImageWithFallback 
          src="https://images.unsplash.com/photo-1761590206515-1816e5123df9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMG1vcm5pbmclMjBjb2ZmZWUlMjBqb3VybmFsfGVufDF8fHx8MTc3MjM5NjE5NHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Morning inspiration"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl mb-2 text-foreground">Good morning</h1>
          <p className="text-foreground/80">Sunday, March 1</p>
        </div>
      </div>

      {/* Today's Featured */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2>Featured for You Today</h2>
        </div>

        <Link
          to={`/podcast/${todaysFeatured.id}`}
          className="block bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl overflow-hidden border border-primary/20 hover:border-primary/40 transition-all"
        >
          <div className="flex gap-4 p-5">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
              <ImageWithFallback 
                src={todaysFeatured.coverImage}
                alt={todaysFeatured.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-primary rounded-full p-2.5">
                  <Play className="w-6 h-6 text-primary-foreground fill-current" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="mb-1.5">{todaysFeatured.title}</h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {todaysFeatured.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{todaysFeatured.duration}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Personalized Recommendations */}
      <div className="px-6 pb-4">
        <div className="bg-card rounded-3xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3>Your Growth This Week</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            You've saved 8 posts about resilience and 5 about mindfulness. Your focus is shifting toward inner strength.
          </p>
          <Link
            to="/profile"
            className="text-sm text-primary flex items-center gap-1"
          >
            See your insights
            <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Episodes */}
      <div className="px-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2>Recent Episodes</h2>
          <Link to="/library?tab=timeline" className="text-sm text-primary">
            View all
          </Link>
        </div>

        <div className="space-y-4">
          {mockPodcasts.map((podcast) => (
            <Link
              key={podcast.id}
              to={`/podcast/${podcast.id}`}
              state={{ from: '/' }}
              className="block bg-card rounded-3xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex gap-4 p-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                  <ImageWithFallback 
                    src={podcast.coverImage}
                    alt={podcast.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-primary rounded-full p-2">
                      <Play className="w-4 h-4 text-primary-foreground fill-current" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="mb-1 truncate text-base">{podcast.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {podcast.date} · {podcast.duration}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {podcast.themes.slice(0, 2).map((themeId) => (
                      <span
                        key={themeId}
                        className={`text-xs ${themeColors[themeId].bg} ${themeColors[themeId].border} border px-2 py-1 rounded-lg`}
                      >
                        {themeColors[themeId].icon} {themeColors[themeId].name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}