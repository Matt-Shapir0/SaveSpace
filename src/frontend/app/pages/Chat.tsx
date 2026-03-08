import { useState, useRef, useEffect } from "react";
import { Send, Heart } from "lucide-react";
import { chatApi, type ChatMessage } from "../lib/api";
import { useUser } from "../lib/useUser";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content:
    "Hey, I'm here for you. Whether you need to vent, celebrate a win, or just think out loud — this is your space. What's on your mind?",
  timestamp: new Date(),
};

const suggestionPrompts = [
  "I'm feeling overwhelmed today",
  "I had a small win I want to share",
  "Why do I keep doubting myself?",
  "I need some encouragement",
];

export function Chat() {
  const { userId } = useUser();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setError(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      // Build the history to send to the backend.
      // We skip the initial assistant greeting so the LLM doesn't
      // think it already introduced itself weirdly.
      const history: ChatMessage[] = updatedMessages
        .slice(1) // drop the hardcoded welcome message
        .map((m) => ({ role: m.role, content: m.content }));

      const { reply } = await chatApi.send(history, userId);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch (e) {
      setError("Couldn't reach the server. Check your connection and try again.");
      // Remove the user message so they can retry
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-background">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-2 rounded-xl">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl">Your Space</h1>
            <p className="text-sm text-muted-foreground">Whatever's on your mind</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-3xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/50"
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 rounded-3xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-xs text-destructive bg-destructive/10 px-4 py-2 rounded-2xl">
              {error}
            </p>
          </div>
        )}

        {/* Suggestion prompts — only show when conversation just started */}
        {messages.length === 1 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm text-muted-foreground px-2">Try saying:</p>
            {suggestionPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSend(prompt)}
                className="w-full text-left bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl px-4 py-3 text-sm transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border/50 bg-background">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="What's on your mind?"
            className="flex-1 bg-input-background rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
