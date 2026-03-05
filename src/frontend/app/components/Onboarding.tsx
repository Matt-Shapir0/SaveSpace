import { useState } from "react";
import { motion } from "motion/react";
import { Heart, Target, Sparkles, ArrowRight } from "lucide-react";

type OnboardingStep = 1 | 2 | 3 | 4;

type UserPreferences = {
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
  {
    id: "gentle",
    label: "Gentle & Compassionate",
    description: "Soft reminders and self-compassion",
  },
  {
    id: "motivational",
    label: "Direct & Motivational",
    description: "Energizing push to take action",
  },
  {
    id: "thoughtful",
    label: "Reflective & Thoughtful",
    description: "Deep questions and introspection",
  },
];

interface OnboardingProps {
  onComplete: (preferences: UserPreferences) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [preferences, setPreferences] = useState<UserPreferences>({
    goals: [],
    interests: [],
    encouragementStyle: "",
  });

  const toggleGoal = (goalId: string) => {
    setPreferences((prev) => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter((g) => g !== goalId)
        : [...prev.goals, goalId],
    }));
  };

  const toggleInterest = (interestId: string) => {
    setPreferences((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((i) => i !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const selectEncouragementStyle = (style: string) => {
    setPreferences((prev) => ({
      ...prev,
      encouragementStyle: style,
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true; // Welcome screen
      case 2:
        return preferences.goals.length > 0;
      case 3:
        return preferences.interests.length > 0;
      case 4:
        return preferences.encouragementStyle !== "";
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep((prev) => (prev + 1) as OnboardingStep);
    } else {
      onComplete(preferences);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress */}
      <div className="px-6 pt-6">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-secondary"
              }`}
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
          {step === 1 && (
            <div className="text-center space-y-6 pt-12">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-3xl mx-auto flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl mb-3">Welcome to Your Space</h1>
                <p className="text-muted-foreground leading-relaxed">
                  A place where your thoughts, goals, and growth come together. Let's personalize your experience.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
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
                {goalOptions.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      preferences.goals.includes(goal.id)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="text-2xl mb-2">{goal.icon}</div>
                    <div className="text-sm">{goal.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl">What interests you?</h2>
                  <p className="text-sm text-muted-foreground">
                    We'll curate content around these themes
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {interestOptions.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      preferences.interests.includes(interest.id)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="text-2xl mb-2">{interest.icon}</div>
                    <div className="text-sm">{interest.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl">How can we support you?</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose your encouragement style
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {encouragementStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => selectEncouragementStyle(style.id)}
                    className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                      preferences.encouragementStyle === style.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="mb-1">{style.label}</div>
                    <p className="text-sm text-muted-foreground">{style.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer Button */}
      <div className="px-6 py-6 border-t border-border/50">
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className="w-full bg-primary text-primary-foreground py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {step === 4 ? "Get Started" : "Continue"}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
