import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During static generation (SSG/prerendering) env vars may be undefined.
    // Return a dummy client that will never be used on the server, preventing
    // the build from crashing. Real client-side usage always has env vars.
    return createBrowserClient("http://localhost:54321", "dummy-key");
  }

  return createBrowserClient(url, key);
}
