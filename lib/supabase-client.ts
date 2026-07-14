import { createBrowserClient } from "@supabase/ssr";
import type { SupportedStorage } from "@supabase/supabase-js";

// Custom storage adapter enforcing localStorage fallback so the browser / PWA
// has a completely bulletproof session store that survives tab closes, kills, 
// background app restarts, and OS memory cleaning.
const customStorageAdapter: SupportedStorage = {
  getItem: (key) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (typeof window !== "undefined") {
      throw new Error(
        "[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. " +
          "Make sure these environment variables are set before building."
      );
    }
    return createBrowserClient("http://localhost:54321", "dummy-key");
  }

  return createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: customStorageAdapter, // Enforce localStorage fallback for PWA / iOS standalone survival
    },
    cookieOptions: {
      maxAge: 31536000, // Sync 1 year expiration limits on headers/cookies
      path: "/",
      sameSite: "lax",
    }
  });
}
