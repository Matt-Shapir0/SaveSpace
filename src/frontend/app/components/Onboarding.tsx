import { useState } from "react";
import { motion } from "motion/react";
import { Heart, Target, Sparkles, ArrowRight, User } from "lucide-react";

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export type UserPreferences = {
  firstName: string;
  goals: string[];
  interests: string[];
  encouragementStyle: string;
};

const goalOptions = [
  { id: "growth", label: "Personal Growth", icon: "🌱" },
  { id: "confidence", label: "Build Confidence", icon: "💪" },
  { id: "mindfulness", label: "Mindfulness & Peace", icon: "🧘" },
  { id: "motivation", label: "Stay Motivated", icon: "🔥" },
  { id: "relationships", label: "Better Relationships", icon: "💝" },
  { id: "wellness", label: "Health & Wellness", icon: "🌟" },
];

const interestOptions = [
  { id: "psychology", label: "Psychology", icon: "🧠" },
  { id: "philosophy", label: "Philosophy", icon: "💭" },
  { id: "productivity", label: "Productivity", icon: "⚡" },
  { id: "creativity", label: "Creativity", icon: "🎨" },
  { id: "fitness", label: "Fitness", icon: "🏃" },
  { id: "spirituality", label: "Spirituality", icon: "✨" },
];

const encouragementStyles = [
  { id: "gentle", label: "Gentle & Compassionate", description: "Soft reminders and self-compassion" },
  { id: "motivational", label: "Direct & Motivational", description: "Energizing push to take action" },
  { id: "thoughtful", label: "Reflective & Thoughtful", description: "Deep questions and introspection" },
];

interface Props {
  onComplete: (preferences: UserPreferences) => void;
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [prefs, setPrefs] = useState<UserPreferences>({
    firstName: "",
    goals: [],
    interests: [],
    encouragementStyle: "",
  });

  const canProceed = () => {
    switch (step) {
      case 1: return prefs.firstName.trim().length > 0;
      case 2: return true; // welcome — always ok
      case 3: return prefs.goals.length > 0;
      case 4: return prefs.interests.length > 0;
      case 5: return prefs.encouragementStyle !== "";
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 5) setStep((s) => (s + 1) as OnboardingStep);
    else onComplete(prefs);
  };

  const toggle = (field: "goals" | "interests", id: string) =>
    setPrefs((p) => ({
      ...p,
      [field]: p[field].includes(id) ? p[field].filter((x) => x !== id) : [...p[field], id],
    }));

  const TOTAL_STEPS = 5;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="px-6 pt-6">
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-secondary"}`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1 — Name */}
          {step === 1 && (
            <div className="space-y-6 pt-8">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl">What should we call you?</h2>
                  <p className="text-sm text-muted-foreground">Just your first name is fine</p>
                </div>
              </div>
              <input
                type="text"
                value={prefs.firstName}
                onChange={(e) => setPrefs((p) => ({ ...p, firstName: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                placeholder="e.g. Alex"
                autoFocus
                className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl px-5 py-4 text-lg outline-none transition-colors"
              />
            </div>
          )}

          {/* Step 2 — Welcome */}
          {step === 2 && (
            <div className="text-center space-y-6 pt-12">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-3xl mx-auto flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl mb-3">Hey {prefs.firstName} 👋</h1>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to EchoFeed. Save videos that inspire you, and we'll turn them into a personalized podcast — and a chat that actually knows what you care about.
                </p>
              </div>
            </div>
          )}

          {/* Step 3 — Goals */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl">What are your goals?</h2>
                  <p className="text-sm text-muted-foreground">Select all that resonate</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {goalOptions.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggle("goals", g.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      prefs.goals.includes(g.id) ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="text-2xl mb-2">{g.icon}</div>
                    <div className="text-sm">{g.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Interests */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl">What interests you?</h2>
                  <p className="text-sm text-muted-foreground">We'll curate content around these themes</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {interestOptions.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => toggle("interests", i.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      prefs.interests.includes(i.id) ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="text-2xl mb-2">{i.icon}</div>
                    <div className="text-sm">{i.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — Tone */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl">How can we support you?</h2>
                  <p className="text-sm text-muted-foreground">Choose your encouragement style</p>
                </div>
              </div>
              <div className="space-y-3">
                {encouragementStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setPrefs((p) => ({ ...p, encouragementStyle: s.id }))}
                    className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                      prefs.encouragementStyle === s.id ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="mb-1">{s.label}</div>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 border-t border-border/50">
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {step === 5 ? "Get Started" : "Continue"}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
