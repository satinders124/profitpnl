import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * POST /api/trial/start
 *
 * Starts a 7-day no-card-required Pro trial for the given user.
 * Each account may only start a trial once (tracked via has_used_trial).
 *
 * Accepts: { uid } (from authenticated user)
 * Returns: { ok: true, trialEndsAtMs }
 */
export async function POST(req: Request) {
  try {
    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check current state
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("plan, plan_source, has_used_trial")
      .eq("id", uid)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Already used trial
    if (profile.has_used_trial) {
      return NextResponse.json(
        { error: "Your free trial has already been used on this account." },
        { status: 403 }
      );
    }

    // Already Pro (paid)
    if (profile.plan === "Pro Plan" && profile.plan_source === "paid") {
      return NextResponse.json(
        { error: "You are already on a paid Pro plan." },
        { status: 400 }
      );
    }

    const trialEndsAtMs = Date.now() + TRIAL_DURATION_MS;
    const trialEndsAt = new Date(trialEndsAtMs).toISOString();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan: "Pro Plan",
        plan_source: "trial",
        trial_started_at: new Date().toISOString(),
        trial_ends_at: trialEndsAt,
        trial_reminder_sent_at: null,
        trial_ended_email_sent_at: null,
        has_used_trial: true,
      })
      .eq("id", uid);

    if (updateError) {
      console.error("Trial start update error:", updateError);
      return NextResponse.json({ error: "Failed to start trial" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, trialEndsAtMs });
  } catch (error) {
    console.error("Trial start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
