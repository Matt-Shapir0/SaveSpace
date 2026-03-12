import { useState, useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Onboarding, type UserPreferences } from "./components/Onboarding";
import { AuthScreen } from "./components/AuthScreen";
import { useAuth } from "./lib/useAuth";
import { profilesApi } from "./lib/api";
import { Loader2 } from "lucide-react";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setHasProfile(null); return; }
    const local = localStorage.getItem(`echofeed_profile_${user.id}`);
    if (local) { setHasProfile(true); return; }
    profilesApi.get(user.id)
      .then(() => { localStorage.setItem(`echofeed_profile_${user.id}`, "1"); setHasProfile(true); })
      .catch(() => setHasProfile(false));
  }, [user?.id]);

  const handleOnboardingComplete = async (prefs: UserPreferences) => {
    if (!user) return;
    localStorage.setItem(`echofeed_profile_${user.id}`, "1");
    localStorage.setItem(`echofeed_name_${user.id}`, prefs.firstName);
    localStorage.setItem("userPreferences", JSON.stringify(prefs));
    setHasProfile(true);
    try { await profilesApi.save(user.id, prefs); }
    catch (e) { console.warn("Could not save profile:", e); }
  };

  if (authLoading || (user && hasProfile === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <AuthScreen onAuth={() => {}} />;
  if (!hasProfile) return <Onboarding onComplete={handleOnboardingComplete} />;
  return <RouterProvider router={router} />;
}