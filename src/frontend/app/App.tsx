import { useState, useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Onboarding } from "./components/Onboarding";

type UserPreferences = {
  goals: string[];
  interests: string[];
  encouragementStyle: string;
};

export default function App() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    const savedPreferences = localStorage.getItem("userPreferences");
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
      setHasCompletedOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (prefs: UserPreferences) => {
    setPreferences(prefs);
    localStorage.setItem("userPreferences", JSON.stringify(prefs));
    setHasCompletedOnboarding(true);
  };

  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <RouterProvider router={router} />;
}
