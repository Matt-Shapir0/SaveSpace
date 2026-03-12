import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Play, Calendar, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { statsApi, type ProfileSummary } from "../lib/api";
import { useUser } from "../lib/useUser";
import { themeColors, type ThemeId } from "../lib/themes";

// ── Static sample data
// Podcast experience before generation is built.
// Replace with real API data once episodes endpoint exists.
const SAMPLE_FEATURED = {
  id: "sample",
  title: "Today's Focus: Building Resilience",
  description: "Based on your interests in personal growth and mindfulness",
  duration: "12 min",
  coverImage:
    "https://images.unsplash.com/photo-1745970347554-854e886c5685?w=800&q=80",
  themes: ["growth", "mindfulness"] as ThemeId[],
};

const SAMPLE_EPISODES = [
  {
    id: "sample-1",
    title: "Your Weekly Reinforcement",
    date: "Mar 1, 2026",
    duration: "18 min",
    coverImage:
      "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?w=400&q=80",
    themes: ["growth", "selfcare"] as ThemeId[],
    excerpt:
      "This week's episode draws from your saved content about resilience and self-compassion.",
  },
  {
    id: "sample-2",
    title: "Finding Your Motivation",
    date: "Feb 23, 2026",
    duration: "22 min",
    coverImage:
      "https://images.unsplash.com/photo-1745970347554-854e886c5685?w=400&q=80",
    themes: ["motivation", "confidence"] as ThemeId[],
    excerpt: "Built from insights about staying consistent with your goals.",
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function getGreeting(firstName?: string | null) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${time}, ${firstName}!` : `${time}!`;
}

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

// ── Component ─────────────────────────────────────────────────────────────────

export function Home() {
  const { userId } = useUser();
  const firstName = userId ? localStorage.getItem(`echofeed_name_${userId}`) : null;
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    statsApi
      .getSummary(userId)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [userId]);

  // Build a natural-language summary of what the user has been saving
  const growthSummary = (() => {
    if (statsLoading) return null;
    if (!summary || summary.total_videos === 0) {
      return "Save your first video to start building your personalized feed.";
    }
    const top = summary.theme_distribution.slice(0, 2);
    if (top.length === 0) {
      return `You've saved ${summary.total_videos} video${summary.total_videos !== 1 ? "s" : ""}. Processing underway — themes will appear soon.`;
    }
    const themeNames = top.map((t) => t.label.toLowerCase()).join(" and ");
    return `You've saved ${summary.total_videos} video${summary.total_videos !== 1 ? "s" : ""} this week, with a strong focus on ${themeNames}. Your mindset is actively shifting.`;
  })();

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <div className="relative h-64 overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1761590206515-1816e5123df9?w=1080&q=80"
          alt="Morning inspiration"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl mb-1 text-foreground">{getGreeting(firstName)}</h1>
          <p className="text-foreground/80 text-sm">{TODAY}</p>
        </div>
      </div>

      {/* ── Featured Episode ── */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2>Featured for You Today</h2>
        </div>

        <Link
          to={`/podcast/${SAMPLE_FEATURED.id}`}
          className="block bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl overflow-hidden border border-primary/20 hover:border-primary/40 transition-all active:scale-[0.99]"
        >
          <div className="flex gap-4 p-5">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
              <ImageWithFallback
                src={SAMPLE_FEATURED.coverImage}
                alt={SAMPLE_FEATURED.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-primary rounded-full p-2.5">
                  <Play className="w-6 h-6 text-primary-foreground fill-current" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex gap-1 flex-wrap mb-2">
                {SAMPLE_FEATURED.themes.map((t) => (
                  <span
                    key={t}
                    className={`text-xs ${themeColors[t]?.bg} ${themeColors[t]?.border} border px-2 py-0.5 rounded-lg`}
                  >
                    {themeColors[t]?.icon} {themeColors[t]?.name}
                  </span>
                ))}
              </div>
              <h3 className="mb-1">{SAMPLE_FEATURED.title}</h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {SAMPLE_FEATURED.description}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{SAMPLE_FEATURED.duration}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Growth Card (real data) ── */}
      <div className="px-6 pb-4">
        <div className="bg-card rounded-3xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3>Your Growth This Week</h3>
          </div>

          {statsLoading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">{growthSummary}</p>

              {/* Real theme pills */}
              {summary && summary.theme_distribution.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {summary.theme_distribution.slice(0, 3).map((t) => (
                    <span
                      key={t.theme_id}
                      className="text-xs px-2.5 py-1 rounded-xl border"
                      style={{
                        backgroundColor: t.color + "20",
                        borderColor: t.color + "40",
                        color: t.color,
                      }}
                    >
                      {t.label} · {t.percentage}%
                    </span>
                  ))}
                </div>
              )}

              <Link to="/insights" className="text-sm text-primary flex items-center gap-1">
                See your insights
                <Sparkles className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Recent Episodes (sample) ── */}
      <div className="px-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2>Recent Episodes</h2>
          <Link to="/library" className="text-sm text-primary">
            View all
          </Link>
        </div>

        <div className="space-y-4">
          {SAMPLE_EPISODES.map((ep) => (
            <Link
              key={ep.id}
              to={`/podcast/${ep.id}`}
              className="block bg-card rounded-3xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all active:scale-[0.99]"
            >
              <div className="flex gap-4 p-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                  <ImageWithFallback
                    src={ep.coverImage}
                    alt={ep.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-primary rounded-full p-2">
                      <Play className="w-4 h-4 text-primary-foreground fill-current" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="mb-1 truncate text-base">{ep.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {ep.date} · {ep.duration}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {ep.themes.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className={`text-xs ${themeColors[t]?.bg} ${themeColors[t]?.border} border px-2 py-0.5 rounded-lg`}
                      >
                        {themeColors[t]?.icon} {themeColors[t]?.name}
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
