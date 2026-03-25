import AsyncStorage from "@react-native-async-storage/async-storage";

import type { UserPreferences } from "@/src/lib/api";

const profileKey = (userId: string) => `echofeed_profile_${userId}`;
const nameKey = (userId: string) => `echofeed_name_${userId}`;
const preferencesKey = "userPreferences";
const likedEpisodesKey = (userId: string) => `liked_episodes_${userId}`;

export async function getHasProfile(userId: string) {
  const value = await AsyncStorage.getItem(profileKey(userId));
  return value === "1";
}

export async function markProfileComplete(userId: string, prefs: UserPreferences) {
  await Promise.all([
    AsyncStorage.setItem(profileKey(userId), "1"),
    AsyncStorage.setItem(nameKey(userId), prefs.firstName),
    AsyncStorage.setItem(preferencesKey, JSON.stringify(prefs)),
  ]);
}

export async function markExistingProfile(userId: string, firstName?: string | null) {
  const writes = [AsyncStorage.setItem(profileKey(userId), "1")];

  if (firstName) {
    writes.push(AsyncStorage.setItem(nameKey(userId), firstName));
  }

  await Promise.all(writes);
}

export async function clearProfile(userId: string | null) {
  const keys = [preferencesKey];

  if (userId) {
    keys.push(profileKey(userId), nameKey(userId));
  }

  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
}

export async function getStoredFirstName(userId: string | null) {
  if (!userId) {
    return null;
  }

  return AsyncStorage.getItem(nameKey(userId));
}

export async function getLikedEpisodes(userId: string | null) {
  if (!userId) {
    return [];
  }

  const value = await AsyncStorage.getItem(likedEpisodesKey(userId));

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function toggleLikedEpisode(userId: string, episodeId: string) {
  const current = await getLikedEpisodes(userId);
  const next = current.includes(episodeId)
    ? current.filter((id) => id !== episodeId)
    : [...current, episodeId];

  await AsyncStorage.setItem(likedEpisodesKey(userId), JSON.stringify(next));
  return next;
}
