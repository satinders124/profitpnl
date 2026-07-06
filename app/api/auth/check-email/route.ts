import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

/**
 * POST /api/auth/check-email
 *
 * Checks whether an email is already registered in auth.users.
 * Used by the registration form to prevent duplicate signups.
 *
 * Accepts: { email, token }
 * Returns: { exists: boolean }
 */
export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // 1. Verify Turnstile CAPTCHA
    if (!token) {
      return NextResponse.json({ error: "CAPTCHA token missing" }, { status: 400 });
    }

    if (TURNSTILE_SECRET_KEY) {
      const formData = new FormData();
      formData.append("secret", TURNSTILE_SECRET_KEY);
      formData.append("response", token);

      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData,
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    // Check whether this email already exists in auth.users.
    // NOTE: this SDK version's listUsers() only accepts { page, perPage } — it
    // has no server-side `search` filter and no getUserByIdentifier(). A naive
    // `listUsers({ perPage: 1 })` only inspected the *first* user and gave
    // wrong answers, so we page through (bounded) and do an exact,
    // case-insensitive match ourselves. For very large user bases, swap this
    // for a `user_email_exists(p_email)` Postgres RPC called with the service
    // role — see recommendation in the PR notes.
    const normalized = email.trim().toLowerCase();
    let exists = false;

    const PER_PAGE = 200;
    const MAX_PAGES = 25; // up to 5,000 users — ample for this guard
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });

      if (error) {
        console.error("Check email listUsers error:", error);
        break;
      }

      const users = data.users || [];
      if (users.some((u) => u.email?.toLowerCase() === normalized)) {
        exists = true;
        break;
      }

      // Stop once we've read the final page.
      if (users.length < PER_PAGE) break;
    }

    return NextResponse.json({ exists });
  } catch (err) {
    console.error("Check email route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
