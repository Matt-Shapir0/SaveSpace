const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
console.log("ENV API:", import.meta.env.VITE_API_URL);

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;

  console.log("API REQUEST:", url, options);

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    console.log("API RESPONSE STATUS:", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("API ERROR RESPONSE:", text);
      throw new ApiError(res.status, text);
    }

    const data = await res.json();
    console.log("API RESPONSE DATA:", data);

    return data;
  } catch (err) {
    console.error("FETCH FAILED:", err);
    throw err;
  }
}

// ── Videos ──────────────────────────────────────────────────────────────────

export type Video = {
  id: string;
  url: string;
  source: string | null;
  status: "pending" | "processing" | "done" | "failed";
  transcript: string | null;
  caption: string | null;
  created_at: string;
};

export const videosApi = {
  submit: (url: string, userId: string) =>
    request<Video>("/videos/", {
      method: "POST",
      body: JSON.stringify({ url, user_id: userId }),
    }),

  getById: (id: string) => request<Video>(`/videos/${id}`),

  getByUser: (userId: string) =>
    request<Video[]>(`/videos/user/${userId}`),
};

// ── Chat ─────────────────────────────────────────────────────────────────────

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const chatApi = {
  send: (messages: ChatMessage[], userId: string) =>
    request<{ reply: string }>("/chat/", {
      method: "POST",
      body: JSON.stringify({ messages, user_id: userId }),
    }),
};

// ── Profiles ─────────────────────────────────────────────────────────────────

export type UserPreferences = {
  goals: string[];
  interests: string[];
  encouragementStyle: string;
};

export const profilesApi = {
  save: (userId: string, prefs: UserPreferences) =>
    request<{ id: string }>("/profiles/", {
      method: "POST",
      body: JSON.stringify({
        id: userId,
        goals: prefs.goals.join(","),
        tone_preference: prefs.encouragementStyle,
      }),
    }),
};
