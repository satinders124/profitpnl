import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import sgMail from "@sendgrid/mail";
import { trialStartedEmailHtml } from "@/lib/email-templates";

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * POST /api/trial/start
 *
 * Starts a 7-day no-card-required Pro trial for the authenticated user.
 * Each account may only start a trial once (tracked via has_used_trial).
 *
 * Returns: { ok: true, trialEndsAtMs }
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate User - ignore uid in body, use authenticated ID
    const user = await getAuthenticatedUser(req);
    const uid = user.id;

    const supabase = createServerClient();

    // Check current state
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("plan, plan_source, has_used_trial, email, display_name")
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

    // Send "trial started" email via SendGrid
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (apiKey && fromEmail && profile.email) {
      sgMail.setApiKey(apiKey);
      try {
        await sgMail.send({
          to: profile.email,
          from: { email: fromEmail, name: "ProfitPnL" },
          subject: "Your 7-day Pro trial has started 🚀",
          text: `Hi ${profile.display_name || "there"},\n\nYour 7-day ProfitPnL Pro trial is now active. You have full access to AI Coaching, unlimited accounts, and advanced analytics until ${new Date(trialEndsAtMs).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.\n\nUpgrade any time during your trial to keep Pro access without interruption.\n\n— The ProfitPnL Team`,
          html: trialStartedEmailHtml(profile.display_name || "there", trialEndsAtMs),
        });
      } catch (emailErr) {
        console.error("Trial start email error:", emailErr);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ ok: true, trialEndsAtMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Trial start error:", error);
    
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
