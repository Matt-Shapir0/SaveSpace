import { useState } from "react";
import { Sparkles, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

type Mode = "signin" | "signup";

type Props = {
  onAuth: () => void; // after successful sign-in or sign-up
};

export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase sends a confirmation email by default.
        // You can disable this in Supabase dashboard → Auth → Email → "Confirm email"
        // For dev, disable it so users go straight in.
        setConfirmation(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth();
      }
    } catch (e: any) {
      // Make Supabase error messages more human-readable
      const msg = e?.message || "Something went wrong";
      if (msg.includes("Invalid login credentials")) {
        setError("Wrong email or password.");
      } else if (msg.includes("already registered")) {
        setError("An account with this email already exists. Try signing in.");
      } else if (msg.includes("Password should be at least")) {
        setError("Password must be at least 6 characters.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (confirmation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl mb-3 text-center">Check your email</h1>
        <p className="text-muted-foreground text-center text-sm leading-relaxed mb-6">
          We sent a confirmation link to <strong>{email}</strong>.
          Click it to activate your account, then come back and sign in.
        </p>
        <button
          onClick={() => { setConfirmation(false); setMode("signin"); }}
          className="text-primary text-sm"
        >
          Back to sign in
        </button>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Tip: Disable email confirmation in Supabase dashboard → Auth → Email for easier dev testing.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-3xl flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl mb-2 text-center">EchoFeed</h1>
        <p className="text-muted-foreground text-center text-sm mb-8">
          Your saved content, turned into a personal podcast
        </p>

        {/* Tab switcher */}
        <div className="flex gap-2 bg-secondary rounded-2xl p-1 w-full max-w-xs mb-6">
          <button
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 py-2 rounded-xl text-sm transition-all ${
              mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 py-2 rounded-xl text-sm transition-all ${
              mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div className="w-full max-w-xs space-y-3">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full bg-card border border-border rounded-2xl pl-11 pr-11 py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-4 py-2 rounded-xl">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "signup" ? (
              "Create Account"
            ) : (
              "Sign In"
            )}
          </button>
        </div>

        {mode === "signin" && (
          <p className="text-xs text-muted-foreground mt-4">
            Don't have an account?{" "}
            <button
              onClick={() => { setMode("signup"); setError(null); }}
              className="text-primary"
            >
              Sign up
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
