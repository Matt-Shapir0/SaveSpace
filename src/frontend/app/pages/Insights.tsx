import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles, Loader2 } from "lucide-react";
import { statsApi, type InsightsData } from "../lib/api";
import { useUser } from "../lib/useUser";

export function Insights() {
  const { userId } = useUser();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    statsApi.getInsights(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get unique theme names from evolution data for chart legend
  const themeKeys = data?.evolution_data.length
    ? Object.keys(data.evolution_data[0]).filter((k) => k !== "week")
    : [];
  const chartColors = ["#e97b4f", "#f4a261", "#e9c46a", "#a8dadc", "#81b29a", "#f2cc8f"];

  return (
    <div className="min-h-screen pb-8">
      <div className="px-6 pt-6 pb-4">
        <h1 className="mb-2">Your Insights</h1>
        <p className="text-muted-foreground text-sm">
          Tracking how your mindset evolves over time
        </p>
      </div>

      {!data?.has_data ? (
        /* Empty state */
        <div className="px-6">
          <div className="bg-card rounded-3xl p-8 border border-border/50 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="mb-2">No data yet</h2>
            <p className="text-sm text-muted-foreground">
              Save a few videos and let them process. Once themes are extracted, your insights will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Theme Evolution Chart */}
          {themeKeys.length > 0 && (
            <div className="px-6 mb-6">
              <div className="bg-card rounded-3xl p-6 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2>Theme Evolution</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-5">
                  How your focus has shifted week by week
                </p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.evolution_data}>
                      <XAxis dataKey="week" stroke="#8b7d72" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#8b7d72" fontSize={12} tickLine={false} axisLine={false} />
                      {themeKeys.map((key, i) => (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={chartColors[i % chartColors.length]}
                          strokeWidth={2}
                          fill={chartColors[i % chartColors.length]}
                          fillOpacity={0.15}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4">
                  {themeKeys.map((key, i) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                      <span className="text-xs text-muted-foreground">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Theme Distribution */}
          {data.distribution.length > 0 && (
            <div className="px-6 mb-6">
              <div className="bg-card rounded-3xl p-6 border border-border/50">
                <h2 className="mb-2">Theme Distribution</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Your focus areas based on all saved content
                </p>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={58}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {data.distribution.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {data.distribution.map((t) => (
                      <div key={t.theme_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-sm">{t.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{t.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Key Insights */}
          <div className="px-6">
            <h2 className="mb-4">Key Insights</h2>
            <div className="space-y-3">
              {data.insights.map((insight, i) => (
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
                      {insight.trend === "down" && <ArrowDownRight className="w-3 h-3" />}
                      <span>{insight.change}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}