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

  // By using the standard createBrowserClient, it automatically writes chunked cookies 
  // and hooks up to the browser's cookies gracefully. If we override the 'storage' key completely 
  // with a non-chunked customStorageAdapter, some async handshakes break cookie verification, 
  // which causes API requests (like clocks, trades, summaries) to fail silently on the client-side!
  return createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    cookieOptions: {
      maxAge: 31536000, // 1 year cookie persistence
      path: "/",
      sameSite: "lax",
    }
  });
}
