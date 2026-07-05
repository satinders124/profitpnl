import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

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

    // 2. Request password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://profitpnl.com"}/settings`,
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
