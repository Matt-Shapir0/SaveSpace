import { useState, useRef, useEffect } from "react";
import { Send, Heart } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hey, I'm here for you. Whether you need to vent, celebrate a win, or just think out loud - this is your space. What's on your mind?",
    timestamp: new Date(),
  },
];

const suggestionPrompts = [
  "I'm feeling overwhelmed today",
  "I had a small win I want to share",
  "Why do I keep doubting myself?",
  "I need some encouragement",
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate friend-like responses
    setTimeout(() => {
      const responses = [
        "I hear you. It makes total sense to feel that way. Remember, you've been saving reminders about being gentle with yourself - maybe that's what you need right now? 💙",
        "That's amazing! Seriously, even small wins matter. I saw you saved something the other day about celebrating progress, not just perfection. This totally counts.",
        "You know what? Looking at your saved content, I notice you've been drawn to posts about inner strength lately. Maybe part of you already knows you're more capable than you're giving yourself credit for.",
        "I get it. Some days are just hard. But I've seen what you save - posts about resilience, about showing up even when it's tough. You're collecting these reminders because they matter to you. Let that sink in.",
        "Here's what I see: you've been saving content about growth and self-compassion. That tells me you're working on something meaningful. It's okay if it doesn't all come together at once.",
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (prompt: string) => {
    handleSend(prompt);
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

        {messages.length === 1 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm text-muted-foreground px-2">Try saying:</p>
            {suggestionPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(prompt)}
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