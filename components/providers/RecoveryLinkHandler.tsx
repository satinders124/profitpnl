"use client";

import { useEffect } from "react";

/**
 * Safety net for password-reset (recovery) deep links.
 *
 * Supabase recovery links carry `type=recovery` plus the session tokens
 * (implicit flow: #access_token=...&refresh_token=...&type=recovery) or a
 * `token_hash` (scanner-proof flow: ?token_hash=...&type=recovery) in the URL.
 * The reset form lives at /reset-password.
 *
 * Two things can cause a recovery link to land somewhere other than
 * /reset-password:
 *   1. Supabase's "Redirect URLs" allow list doesn't include /reset-password,
 *      so it ignores `redirectTo` and falls back to the Site URL root ("/").
 *   2. The user opens the link on a route that doesn't mount AuthProvider
 *      (the public homepage intentionally skips it to stay light).
 *
 * This handler forwards any recovery link that lands on a non-reset route to
 * /reset-password, preserving the fragment/query so the reset page can read
 * the tokens. It renders nothing and performs no Supabase calls, so it's safe
 * to mount everywhere (including the lightweight homepage).
 */
export function RecoveryLinkHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { hash, search, pathname } = window.location;
    const hasRecovery =
      /[?&]type=recovery\b/.test(hash) || /[?&]type=recovery\b/.test(search);

    if (!hasRecovery) return;
    if (pathname === "/reset-password") return; // already on the form

    // Preserve the full fragment/query so the reset page can read the tokens.
    const target = `/reset-password${hash || search}`;
    window.location.replace(target);
  }, []);

  return null;
}
