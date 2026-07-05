import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * POST /api/auth/check-email
 *
 * Checks whether an email is already registered in auth.users.
 * Used by the registration form to prevent duplicate signups.
 *
 * Accepts: { email }
 * Returns: { exists: boolean }
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
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
