import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import sgMail from "@sendgrid/mail";
import { trialEndedEmailHtml, trialEndingSoonEmailHtml } from "@/lib/email-templates";

export const runtime = "nodejs";

const TRIAL_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours before expiry

/**
 * Daily cron job that:
 *  1. Sends a "trial ends tomorrow" reminder to trial users within 24h of expiry.
 *  2. Reverts expired trial users back to Free Plan and sends a "trial ended" email.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (apiKey) sgMail.setApiKey(apiKey);

  const supabase = createServerClient();
  const now = Date.now();

  // Get all trial users
  const { data: trialUsers, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, plan, plan_source, trial_ends_at, trial_reminder_sent_at, trial_ended_email_sent_at")
    .eq("plan_source", "trial")
    .eq("plan", "Pro Plan");

  if (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch trial users" }, { status: 500 });
  }

  let remindersSent = 0;
  let expiredReverted = 0;
  const errors: string[] = [];

  for (const user of trialUsers || []) {
    const uid = user.id;
    const email = user.email;
    const name = user.display_name || "there";
    const trialEndsAtMs = user.trial_ends_at ? new Date(user.trial_ends_at).getTime() : null;

    if (!trialEndsAtMs) continue;

    const msRemaining = trialEndsAtMs - now;

    try {
      if (msRemaining <= 0) {
        // Trial expired
        if (!user.trial_ended_email_sent_at) {
          // Revert to Free Plan and send email
          await supabase
            .from("profiles")
            .update({
              plan: "Free Plan",
              trial_ended_email_sent_at: new Date().toISOString(),
            })
            .eq("id", uid);

          if (email && apiKey && fromEmail) {
            await sgMail.send({
              to: email,
              from: { email: fromEmail, name: "ProfitPnL" },
              subject: "Your ProfitPnL Pro trial has ended",
              text: `Hi ${name},\n\nYour 7-day Pro trial has ended and your account is back on the Free Plan. Nothing was charged. Upgrade any time from the Upgrade page to unlock Pro again.\n\n— The ProfitPnL Team`,
              html: trialEndedEmailHtml(name),
            });
          }
          expiredReverted++;
        } else {
          // Already emailed but plan still Pro — repair
          await supabase
            .from("profiles")
            .update({ plan: "Free Plan" })
            .eq("id", uid);
        }
      } else if (msRemaining <= TRIAL_REMINDER_WINDOW_MS && !user.trial_reminder_sent_at) {
        // Trial ending soon — send reminder
        await supabase
          .from("profiles")
          .update({ trial_reminder_sent_at: new Date().toISOString() })
          .eq("id", uid);

        if (email && apiKey && fromEmail) {
          await sgMail.send({
            to: email,
            from: { email: fromEmail, name: "ProfitPnL" },
            subject: "Your ProfitPnL Pro trial ends tomorrow",
            text: `Hi ${name},\n\nYour 7-day Pro trial ends tomorrow. Upgrade now to keep AI Coaching, unlimited accounts, and advanced analytics without interruption.\n\n— The ProfitPnL Team`,
            html: trialEndingSoonEmailHtml(name),
          });
        }
        remindersSent++;
      }
    } catch (err) {
      errors.push(`${uid}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: trialUsers?.length || 0,
    remindersSent,
    expiredReverted,
    errors,
  });
}
