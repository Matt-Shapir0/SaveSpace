import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, ArrowUpRight, Sparkles, Settings, ExternalLink, LogOut, Loader2 } from "lucide-react";
import { statsApi, type ProfileSummary, type InsightsData } from "../lib/api";
import { useUser } from "../lib/useUser";
import { supabase } from "../lib/supabase";

export function Profile() {
  const { userId, email } = useUser();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      statsApi.getSummary(userId),
      statsApi.getInsights(userId),
    ]).then(([s, i]) => {
      setSummary(s);
      setInsights(i);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSignOut = async () => {
    if (userId) localStorage.removeItem(`echofeed_profile_${userId}`);
    localStorage.removeItem("userPreferences");
    await supabase.auth.signOut();
  };

  const handleResetOnboarding = () => {
    if (userId) localStorage.removeItem(`echofeed_profile_${userId}`);
    localStorage.removeItem("userPreferences");
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="mb-1">Your Profile</h1>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          <button className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Real Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-4 border border-primary/20">
            <div className="text-2xl mb-1">{summary?.total_videos ?? 0}</div>
            <div className="text-xs text-muted-foreground">Saved Videos</div>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-4 border border-primary/20">
            <div className="text-2xl mb-1">{summary?.processed_videos ?? 0}</div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-4 border border-primary/20">
            <div className="text-2xl mb-1">{summary?.weeks_active ?? 1}</div>
            <div className="text-xs text-muted-foreground">Weeks Active</div>
          </div>
        </div>
      </div>

      {/* Theme Evolution Chart — only if we have weekly data */}
      {insights?.has_data && insights.evolution_data.length > 0 && (
        <div className="px-6 mb-6">
          <div className="bg-card rounded-3xl p-6 border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2>Theme Evolution</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              How your mindset themes are shifting over time
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.evolution_data}>
                  <XAxis dataKey="week" stroke="#8b7d72" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8b7d72" fontSize={12} tickLine={false} axisLine={false} />
                  {/* Dynamically render one Area per theme found in data */}
                  {Object.keys(insights.evolution_data[0] || {})
                    .filter((k) => k !== "week")
                    .map((key, i) => {
                      const colors = ["#e97b4f", "#f4a261", "#e9c46a", "#a8dadc", "#81b29a", "#f2cc8f"];
                      const color = colors[i % colors.length];
                      return (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                          strokeWidth={2}
                          fill={color}
                          fillOpacity={0.15}
                        />
                      );
                    })}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Theme Distribution — only if user has processed videos with themes */}
      {summary && summary.theme_distribution.length > 0 && (
        <div className="px-6 mb-6">
          <div className="bg-card rounded-3xl p-6 border border-border/50">
            <h2 className="mb-2">Theme Distribution</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Your focus areas based on saved content
            </p>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.theme_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      paddingAngle={2}
                      dataKey="percentage"
                    >
                      {summary.theme_distribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {summary.theme_distribution.slice(0, 5).map((t) => (
                  <div key={t.theme_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-sm">{t.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{t.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No themes yet */}
      {summary && summary.theme_distribution.length === 0 && (
        <div className="px-6 mb-6">
          <div className="bg-card rounded-3xl p-6 border border-border/50 text-center">
            <div className="text-4xl mb-3">🌱</div>
            <p className="text-sm text-muted-foreground">
              Save a few videos and let them process — your theme profile will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights && insights.insights.length > 0 && (
        <div className="px-6 mb-6">
          <h2 className="mb-3">Recent Insights</h2>
          <div className="space-y-3">
            {insights.insights.map((insight, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="text-base">{insight.title}</h3>
                  </div>
                  <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                    insight.trend === "up" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                  }`}>
                    {insight.trend === "up" && <ArrowUpRight className="w-3 h-3" />}
                    <span>{insight.change}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="px-6">
        <h2 className="mb-3">Settings</h2>
        <div className="space-y-2">
          <button
            onClick={handleResetOnboarding}
            className="w-full bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between text-left hover:border-primary/30 transition-colors"
          >
            <span className="text-sm">Re-run Onboarding</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleSignOut}
            className="w-full bg-card rounded-2xl p-4 border border-destructive/20 flex items-center justify-between text-left hover:border-destructive/40 transition-colors"
          >
            <span className="text-sm text-destructive">Sign Out</span>
            <LogOut className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}
