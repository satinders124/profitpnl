import { createBrowserClient } from "@supabase/ssr";

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
    },
    cookieOptions: {
      maxAge: 31536000, // Persist cookie sessions for 1 year so closing the tab/reopening the app doesn't log the user out
      path: "/",
      sameSite: "lax",
    }
  });
}
