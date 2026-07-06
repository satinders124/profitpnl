import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

/**
 * Resolve the public origin the reset link should point back to.
 * Prefers the forwarded host/proto (set by Vercel / any proxy) so the emailed
 * link matches the environment the user is actually on. Falls back to the
 * configured APP_URL, then to the request URL itself.
 */
function getRequestOrigin(req: Request): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");

  if (forwardedProto && (forwardedHost || host)) {
    return `${forwardedProto}://${forwardedHost || host}`;
  }

  try {
    return new URL(req.url).origin;
  } catch {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://profitpnl.com"
    );
  }
}

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
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

    // 2. Request password reset.
    // Derive the origin from the incoming request so the reset link works in
    // every environment (localhost, Vercel preview, production) instead of
    // being hard-coded to a single domain. A mismatched origin here is a
    // common cause of "error=access_denied" links — Supabase refuses to
    // redirect to a host that isn't the one the request came from.
    const appUrl = getRequestOrigin(req);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
      // To prevent user enumeration, always return success or a generic error
      console.error("Reset password error:", error);
      return NextResponse.json({ error: "An error occurred. Please try again later." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Forgot password API error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
