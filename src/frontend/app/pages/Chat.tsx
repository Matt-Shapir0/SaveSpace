import { useState, useRef, useEffect } from "react";
import { Send, Heart, BookOpen } from "lucide-react";
import { chatApi, type ChatMessage } from "../lib/api";
import { useUser } from "../lib/useUser";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  usedRag?: boolean;
};

const INITIAL_MESSAGE: Message = {
  id: "0",
  role: "assistant",
  content: "Hey, I'm here for you. Whatever's on your mind — vent, celebrate, or just think out loud. What's up?",
};

const SUGGESTIONS = [
  "I'm feeling overwhelmed today",
  "I had a small win I want to share",
  "Why do I keep doubting myself?",
  "I need some encouragement",
];

export function Chat() {
  const { userId } = useUser();
  const firstName = userId ? localStorage.getItem(`echofeed_name_${userId}`) : null;
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping || !userId) return;
    setError(null);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsTyping(true);

    try {
      // Build history for backend — skip the hardcoded welcome
      const history: ChatMessage[] = next
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const { reply, used_rag } = await chatApi.send(history, userId);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: reply, usedRag: used_rag },
      ]);
    } catch {
      setError("Couldn't reach the server. Try again.");
      // Roll back user message
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-background">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-2 rounded-xl">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl">Your Space</h1>
            <p className="text-sm text-muted-foreground">
              {firstName
                ? `Echo knows what you've been saving, ${firstName}`
                : "Powered by your saved content"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[82%] space-y-1">
              <div className={`rounded-3xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/50 text-foreground"
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Subtle badge when saved content was referenced */}
              {msg.role === "assistant" && msg.usedRag && (
                <div className="flex items-center gap-1.5 px-2">
                  <BookOpen className="w-3 h-3 text-primary/50" />
                  <span className="text-xs text-primary/50">Referenced your saved videos</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 rounded-3xl px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 200, 400].map((delay) => (
                  <div
                    key={delay}
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-center">
            <p className="text-xs text-destructive bg-destructive/10 px-4 py-2 rounded-2xl">{error}</p>
          </div>
        )}

        {/* Suggestion chips — only on first load */}
        {messages.length === 1 && !isTyping && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-muted-foreground px-1">Try saying:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="w-full text-left bg-secondary hover:bg-secondary/70 rounded-2xl px-4 py-3 text-sm transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-6 py-4 border-t border-border/50 bg-background">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); }
            }}
            placeholder="What's on your mind?"
            disabled={isTyping}
            className="flex-1 bg-secondary rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            className="bg-primary text-primary-foreground rounded-2xl p-3 disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
