import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

const themeEvolutionData = [
  { week: "Week 1", "Growth Mindset": 5, "Self-Care": 8, "Motivation": 3 },
  { week: "Week 2", "Growth Mindset": 8, "Self-Care": 6, "Motivation": 5 },
  { week: "Week 3", "Growth Mindset": 12, "Self-Care": 4, "Motivation": 7 },
  { week: "Week 4", "Growth Mindset": 10, "Self-Care": 9, "Motivation": 8 },
];

const themeDistribution = [
  { name: "Growth Mindset", value: 35, color: "#e97b4f" },
  { name: "Self-Care", value: 27, color: "#f4a261" },
  { name: "Motivation", value: 23, color: "#e9c46a" },
  { name: "Confidence", value: 15, color: "#a8dadc" },
];

const insights = [
  {
    title: "Shifting Focus",
    description: "You've saved 40% more content about growth mindset this week",
    trend: "up",
    change: "+40%",
  },
  {
    title: "Consistent Theme",
    description: "Self-care has been a steady focus for 3 weeks",
    trend: "neutral",
    change: "Stable",
  },
  {
    title: "New Interest",
    description: "Goal setting emerged as a new theme this week",
    trend: "up",
    change: "New",
  },
];

export function Insights() {
  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="mb-2">Your Insights</h1>
        <p className="text-muted-foreground">
          Tracking how your mindset evolves over time
        </p>
      </div>

      {/* Theme Evolution Chart */}
      <div className="px-6 mb-6">
        <div className="bg-card rounded-3xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2>Theme Evolution</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            See how your saved content themes have changed over the past month
          </p>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={themeEvolutionData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e97b4f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e97b4f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSelfCare" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f4a261" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f4a261" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMotivation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e9c46a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e9c46a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="week"
                  stroke="#8b7d72"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#8b7d72" fontSize={12} tickLine={false} axisLine={false} />
                <Area
                  type="monotone"
                  dataKey="Growth Mindset"
                  stroke="#e97b4f"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGrowth)"
                />
                <Area
                  type="monotone"
                  dataKey="Self-Care"
                  stroke="#f4a261"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSelfCare)"
                />
                <Area
                  type="monotone"
                  dataKey="Motivation"
                  stroke="#e9c46a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMotivation)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#e97b4f]" />
              <span className="text-xs text-muted-foreground">Growth Mindset</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f4a261]" />
              <span className="text-xs text-muted-foreground">Self-Care</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#e9c46a]" />
              <span className="text-xs text-muted-foreground">Motivation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Distribution */}
      <div className="px-6 mb-6">
        <div className="bg-card rounded-3xl p-6 border border-border/50">
          <h2 className="mb-4">Theme Distribution</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your focus areas based on saved content
          </p>

          <div className="flex items-center gap-8">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={themeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {themeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-3">
              {themeDistribution.map((theme) => (
                <div key={theme.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.color }}
                    />
                    <span className="text-sm">{theme.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{theme.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="px-6">
        <h2 className="mb-4">Key Insights</h2>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-4 border border-border/50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-base">{insight.title}</h3>
                </div>
                <div
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                    insight.trend === "up"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
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
    </div>
  );
}
