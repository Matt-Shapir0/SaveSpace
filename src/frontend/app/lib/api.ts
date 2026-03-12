const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Videos
export type Video = {
  id: string; url: string; source: string | null;
  status: "pending" | "processing" | "done" | "failed";
  transcript: string | null; caption: string | null;
  theme_tags: string[]; created_at: string;
};
export const videosApi = {
  submit: (url: string, userId: string) => request<Video>("/videos/", { method: "POST", body: JSON.stringify({ url, user_id: userId }) }),
  getById: (id: string) => request<Video>(`/videos/${id}`),
  getByUser: (userId: string) => request<Video[]>(`/videos/user/${userId}`),
  deleteVideo: (id: string) =>
  request<{ deleted: string }>(`/videos/${id}`, { method: "DELETE" }),
};

// Chat
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatResponse = { reply: string; used_rag: boolean };
export const chatApi = {
  send: (messages: ChatMessage[], userId: string) =>
    request<ChatResponse>("/chat/", { method: "POST", body: JSON.stringify({ messages, user_id: userId }) }),
};

// Profiles
export type UserPreferences = { firstName: string; goals: string[]; interests: string[]; encouragementStyle: string };
export const profilesApi = {
  save: (userId: string, prefs: UserPreferences) =>
    request<{ id: string }>("/profiles/", {
      method: "POST",
      body: JSON.stringify({ id: userId, first_name: prefs.firstName, goals: prefs.goals, interests: prefs.interests, tone_preference: prefs.encouragementStyle }),
    }),
  get: (userId: string) => request<any>(`/profiles/${userId}`),
};

// Stats
export type ThemeDistributionItem = { theme_id: string; label: string; color: string; count: number; percentage: number };
export type ProfileSummary = { total_videos: number; processed_videos: number; weeks_active: number; theme_distribution: ThemeDistributionItem[]; top_theme: ThemeDistributionItem | null };
export type InsightItem = { title: string; description: string; trend: "up" | "down" | "neutral"; change: string };
export type InsightsData = { evolution_data: Record<string, number | string>[]; distribution: { name: string; value: number; color: string; theme_id: string }[]; insights: InsightItem[]; has_data: boolean };
export const statsApi = {
  getSummary: (userId: string) => request<ProfileSummary>(`/stats/${userId}/summary`),
  getInsights: (userId: string) => request<InsightsData>(`/stats/${userId}/insights`),
};
