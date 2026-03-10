import { useState, useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Onboarding } from "./components/Onboarding";
import { profilesApi, type UserPreferences } from "./lib/api";
import { useUser } from "./lib/useUser";

export default function App() {
  const { userId } = useUser();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("userPreferences");
    if (saved) setHasCompletedOnboarding(true);
  }, []);

  const handleOnboardingComplete = async (prefs: UserPreferences) => {
    // Save locally so we don't re-show onboarding on refresh
    localStorage.setItem("userPreferences", JSON.stringify(prefs));
    setHasCompletedOnboarding(true);

    // Save to backend (non-blocking — don't fail onboarding if API is down)
    try {
      await profilesApi.save(userId, prefs);
    } catch (e) {
      console.warn("Could not save preferences to backend:", e);
    }
  };

  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <RouterProvider router={router} />;
}