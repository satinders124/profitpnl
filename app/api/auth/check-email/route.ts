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

    // Query auth.users via admin API to check if email exists
    const { data, error } = await supabase.auth.admin.listUsers({
      perPage: 1,
    });

    if (error) {
      console.error("Check email error:", error);
      return NextResponse.json(
        { error: "Unable to verify email" },
        { status: 500 }
      );
    }

    const normalized = email.trim().toLowerCase();
    const exists = (data.users || []).some(
      (u) => u.email?.toLowerCase() === normalized
    );

    return NextResponse.json({ exists });
  } catch (err) {
    console.error("Check email route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
