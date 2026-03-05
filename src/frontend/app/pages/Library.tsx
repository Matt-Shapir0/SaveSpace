import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Play, Calendar, ChevronRight, Heart } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { themeColors, type ThemeId } from "../lib/themes";

type Episode = {
  id: string;
  title: string;
  date: string;
  duration: string;
  savedItems: number;
  coverImage: string;
  isFavorited?: boolean;
};

type SavedContent = {
  id: string;
  source: string;
  author: string;
  excerpt: string;
  savedDate: string;
};

type ThemeCategory = {
  id: ThemeId;
  itemCount: number;
  episodes: Episode[];
  savedContent: SavedContent[];
};

const themeCategories: ThemeCategory[] = [
  {
    id: "growth",
    itemCount: 35,
    episodes: [
      {
        id: "1",
        title: "Your Weekly Reinforcement",
        date: "Mar 1, 2026",
        duration: "18 min",
        savedItems: 12,
        coverImage: "https://images.unsplash.com/photo-1758874572918-178c7f8e74df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBsaXN0ZW5pbmclMjBoZWFkcGhvbmVzJTIwY2FsbXxlbnwxfHx8fDE3NzIzOTYxOTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
        isFavorited: true,
      },
    ],
    savedContent: [
      {
        id: "1",
        source: "Instagram",
        author: "@motivation_daily",
        excerpt: "Growth happens when you're uncomfortable. That's where the magic is.",
        savedDate: "2 days ago",
      },
      {
        id: "2",
        source: "Twitter",
        author: "@growth_mindset",
        excerpt: "Your potential is not fixed. Every day is a chance to become better than yesterday.",
        savedDate: "5 days ago",
      },
    ],
  },
  {
    id: "selfcare",
    itemCount: 27,
    episodes: [
      {
        id: "3",
        title: "Finding Balance",
        date: "Feb 16, 2026",
        duration: "16 min",
        savedItems: 9,
        coverImage: "https://images.unsplash.com/photo-1761590206515-1816e5123df9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWFjZWZ1bCUyMG1vcm5pbmclMjBjb2ZmZWUlMjBqb3VybmFsfGVufDF8fHx8MTc3MjM5NjE5NHww&ixlib=rb-4.1.0&q=80&w=1080",
      },
    ],
    savedContent: [
      {
        id: "3",
        source: "TikTok",
        author: "@mindfulness",
        excerpt: "Self-care isn't selfish. You can't pour from an empty cup.",
        savedDate: "3 days ago",
      },
      {
        id: "4",
        source: "Instagram",
        author: "@wellness_coach",
        excerpt: "Rest is not a reward, it's a requirement.",
        savedDate: "1 week ago",
      },
    ],
  },
  {
    id: "motivation",
    itemCount: 23,
    episodes: [
      {
        id: "2",
        title: "Finding Your Motivation",
        date: "Feb 23, 2026",
        duration: "22 min",
        savedItems: 18,
        coverImage: "https://images.unsplash.com/photo-1745970347554-854e886c5685?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm93dGglMjBtaW5kc2V0JTIwcGxhbnRzfGVufDF8fHx8MTc3MjM5NjE5NHww&ixlib=rb-4.1.0&q=80&w=1080",
      },
    ],
    savedContent: [
      {
        id: "5",
        source: "Twitter",
        author: "@daily_motivation",
        excerpt: "Small consistent actions > big inconsistent efforts",
        savedDate: "1 week ago",
      },
    ],
  },
  {
    id: "confidence",
    itemCount: 15,
    episodes: [],
    savedContent: [
      {
        id: "6",
        source: "Instagram",
        author: "@confidence_coach",
        excerpt: "You are capable of more than you realize. Trust yourself.",
        savedDate: "4 days ago",
      },
    ],
  },
];

type ViewType = "themes" | "timeline";

export function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(null);
  const [viewType, setViewType] = useState<ViewType>("themes");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["1"]));

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "timeline") {
      setViewType("timeline");
    }
  }, [searchParams]);

  const selectedThemeData = themeCategories.find((t) => t.id === selectedTheme);

  const toggleFavorite = (episodeId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(episodeId)) {
        newFavorites.delete(episodeId);
      } else {
        newFavorites.add(episodeId);
      }
      return newFavorites;
    });
  };

  if (selectedTheme && selectedThemeData) {
    const theme = themeColors[selectedTheme];
    return (
      <div className="min-h-screen">
        {/* Theme Header */}
        <div className="px-6 pt-6 pb-4">
          <button
            onClick={() => setSelectedTheme(null)}
            className="text-primary mb-4 flex items-center gap-1 text-sm"
          >
            ← Back to Library
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className={`${theme.bg} ${theme.border} border-2 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl`}>
              {theme.icon}
            </div>
            <div>
              <h1 className="text-2xl">{theme.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedThemeData.itemCount} saved items
              </p>
            </div>
          </div>
        </div>

        {/* Episodes for this theme */}
        {selectedThemeData.episodes.length > 0 && (
          <div className="px-6 mb-6">
            <h2 className="mb-3">Episodes</h2>
            <div className="space-y-3">
              {selectedThemeData.episodes.map((episode) => (
                <div key={episode.id} className="relative">
                  <Link
                    to={`/podcast/${episode.id}`}
                    state={{ from: '/library' }}
                    className="block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                        <ImageWithFallback 
                          src={episode.coverImage}
                          alt={episode.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="bg-primary rounded-full p-2">
                            <Play className="w-4 h-4 text-primary-foreground fill-current" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 pr-8">
                        <h3 className="mb-1 text-base">{episode.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{episode.date}</span>
                          <span>·</span>
                          <span>{episode.duration}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {episode.savedItems} saved items
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(episode.id);
                    }}
                    className="absolute top-4 right-4 p-2 hover:scale-110 transition-transform"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        favorites.has(episode.id)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Content */}
        <div className="px-6 pb-8">
          <h2 className="mb-3">Saved Content</h2>
          <div className="space-y-3">
            {selectedThemeData.savedContent.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-2xl p-4 border border-border/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs text-muted-foreground">
                    {item.source} · {item.author}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.savedDate}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{item.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="mb-4">Your Library</h1>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setViewType("themes");
              setSearchParams({});
            }}
            className={`flex-1 py-3 px-4 rounded-2xl transition-all text-sm ${
              viewType === "themes"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            Themes
          </button>
          <button
            onClick={() => {
              setViewType("timeline");
              setSearchParams({ tab: "timeline" });
            }}
            className={`flex-1 py-3 px-4 rounded-2xl transition-all text-sm ${
              viewType === "timeline"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        {viewType === "themes" ? (
          <div className="space-y-3">
            {themeCategories.map((themeCategory) => {
              const theme = themeColors[themeCategory.id];
              return (
                <button
                  key={themeCategory.id}
                  onClick={() => setSelectedTheme(themeCategory.id)}
                  className={`w-full ${theme.bg} ${theme.border} border-2 rounded-3xl p-5 text-left hover:scale-[1.02] transition-transform`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{theme.icon}</div>
                      <div>
                        <h3 className="text-lg">{theme.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {themeCategory.itemCount} items · {themeCategory.episodes.length} episodes
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Preview of recent items */}
                  {themeCategory.savedContent.length > 0 && (
                    <div className="bg-card/50 rounded-2xl p-3 border border-border/30">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        Latest: "{themeCategory.savedContent[0].excerpt}"
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {/* This Week */}
            <div>
              <h3 className="mb-3 text-sm text-muted-foreground">This Week</h3>
              <div className="space-y-3">
                {themeCategories.flatMap(themeCategory => 
                  themeCategory.episodes
                    .filter(ep => ep.date === "Mar 1, 2026")
                    .map(episode => {
                      const theme = themeColors[themeCategory.id];
                      return (
                        <div key={episode.id} className="relative">
                          <Link
                            to={`/podcast/${episode.id}`}
                            state={{ from: '/library' }}
                            className="block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all"
                          >
                            <div className="flex gap-4 p-4">
                              <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                                <ImageWithFallback 
                                  src={episode.coverImage}
                                  alt={episode.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="bg-primary rounded-full p-2">
                                    <Play className="w-4 h-4 text-primary-foreground fill-current" />
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 pr-8">
                                <h3 className="mb-1 text-base">{episode.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{episode.date}</span>
                                  <span>·</span>
                                  <span>{episode.duration}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs ${theme.bg} ${theme.border} border px-2 py-0.5 rounded-lg`}>
                                    {theme.icon} {theme.name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFavorite(episode.id);
                            }}
                            className="absolute top-4 right-4 p-2 hover:scale-110 transition-transform"
                          >
                            <Heart
                              className={`w-5 h-5 ${
                                favorites.has(episode.id)
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Earlier */}
            <div>
              <h3 className="mb-3 text-sm text-muted-foreground">Earlier</h3>
              <div className="space-y-3">
                {themeCategories.flatMap(themeCategory => 
                  themeCategory.episodes
                    .filter(ep => ep.date !== "Mar 1, 2026")
                    .map(episode => {
                      const theme = themeColors[themeCategory.id];
                      return (
                        <div key={episode.id} className="relative">
                          <Link
                            to={`/podcast/${episode.id}`}
                            state={{ from: '/library' }}
                            className="block bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all"
                          >
                            <div className="flex gap-4 p-4">
                              <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
                                <ImageWithFallback 
                                  src={episode.coverImage}
                                  alt={episode.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="bg-primary rounded-full p-2">
                                    <Play className="w-4 h-4 text-primary-foreground fill-current" />
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 pr-8">
                                <h3 className="mb-1 text-base">{episode.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{episode.date}</span>
                                  <span>·</span>
                                  <span>{episode.duration}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs ${theme.bg} ${theme.border} border px-2 py-0.5 rounded-lg`}>
                                    {theme.icon} {theme.name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFavorite(episode.id);
                            }}
                            className="absolute top-4 right-4 p-2 hover:scale-110 transition-transform"
                          >
                            <Heart
                              className={`w-5 h-5 ${
                                favorites.has(episode.id)
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
