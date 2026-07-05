import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // If we're in the browser, env vars MUST be available — they were
    // inlined at build time. If they're missing, the build was done
    // without setting NEXT_PUBLIC_SUPABASE_URL and
    // NEXT_PUBLIC_SUPABASE_ANON_KEY. Throw a clear error so it's
    // obvious what needs fixing.
    if (typeof window !== "undefined") {
      throw new Error(
        "[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. " +
          "Make sure these environment variables are set before building."
      );
    }

    // During static generation (SSG/prerendering) env vars may be undefined
    // because client-only code is evaluated during the SSR pass. Return a
    // dummy client that prevents the build from crashing. This dummy client
    // is never used in the browser — it's only hit during the server render.
    return createBrowserClient("http://localhost:54321", "dummy-key");
  }

  return createBrowserClient(url, key);
}
