import AsyncStorage from "@react-native-async-storage/async-storage";

import type { UserPreferences } from "@/src/lib/api";

const profileKey = (userId: string) => `echofeed_profile_${userId}`;
const nameKey = (userId: string) => `echofeed_name_${userId}`;
const preferencesKey = "userPreferences";
const likedEpisodesKey = (userId: string) => `liked_episodes_${userId}`;
const collectionsKey = (userId: string) => `saved_collections_${userId}`;
const schedulePreferencesKey = (userId: string) => `schedule_preferences_${userId}`;

export type SavedCollection = {
  id: string;
  name: string;
  description: string;
  color: string;
  videoIds: string[];
  createdAt: string;
};

export type SchedulePreferences = {
  frequency: "daily" | "weekly";
  timeOfDay: string;
  weeklyDay: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  autoGenerate: boolean;
};

const defaultSchedulePreferences: SchedulePreferences = {
  frequency: "daily",
  timeOfDay: "08:00",
  weeklyDay: "Mon",
  autoGenerate: true,
};

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

export async function getSavedCollections(userId: string | null) {
  if (!userId) {
    return [];
  }

  const value = await AsyncStorage.getItem(collectionsKey(userId));

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as SavedCollection[]) : [];
  } catch {
    return [];
  }
}

export async function saveSavedCollections(userId: string, collections: SavedCollection[]) {
  await AsyncStorage.setItem(collectionsKey(userId), JSON.stringify(collections));
}

export async function createSavedCollection(
  userId: string,
  collection: Omit<SavedCollection, "id" | "createdAt">
) {
  const current = await getSavedCollections(userId);
  const nextCollection: SavedCollection = {
    ...collection,
    id: `collection_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const next = [nextCollection, ...current];
  await saveSavedCollections(userId, next);
  return next;
}

export async function toggleVideoInCollection(
  userId: string,
  collectionId: string,
  videoId: string
) {
  const current = await getSavedCollections(userId);
  const next = current.map((collection) => {
    if (collection.id !== collectionId) {
      return collection;
    }

    const exists = collection.videoIds.includes(videoId);

    return {
      ...collection,
      videoIds: exists
        ? collection.videoIds.filter((id) => id !== videoId)
        : [...collection.videoIds, videoId],
    };
  });

  await saveSavedCollections(userId, next);
  return next;
}

export async function getSchedulePreferences(userId: string | null) {
  if (!userId) {
    return defaultSchedulePreferences;
  }

  const value = await AsyncStorage.getItem(schedulePreferencesKey(userId));

  if (!value) {
    return defaultSchedulePreferences;
  }

  try {
    return {
      ...defaultSchedulePreferences,
      ...(JSON.parse(value) as Partial<SchedulePreferences>),
    };
  } catch {
    return defaultSchedulePreferences;
  }
}

export async function saveSchedulePreferences(
  userId: string,
  preferences: SchedulePreferences
) {
  await AsyncStorage.setItem(schedulePreferencesKey(userId), JSON.stringify(preferences));
}
