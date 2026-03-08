// Manages a simple user identity stored in localStorage.
// This is a temporary stand-in until Supabase Auth is wired up.
// When add real auth, swap this hook's internals — all pages!!
// that call useUser() will automatically get the real user ID.

import { useState, useEffect } from "react";

const USER_ID_KEY = "echofeed_user_id";

function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    // Generate a UUID-like ID for this device
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function useUser() {
  const [userId] = useState<string>(getOrCreateUserId);
  return { userId };
}