import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import sgMail from "@sendgrid/mail";
import { trialEndedEmailHtml, trialEndingSoonEmailHtml } from "@/lib/email-templates";
import { decideTrialCronAction } from "@/lib/trial";

export const runtime = "nodejs";

/**
 * Daily job (see vercel.json "crons") that:
 *  1. Sends a "trial ends tomorrow" reminder to trial users within 24h of
 *     expiry who haven't been reminded yet.
 *  2. Reverts any trial user whose trialEndsAt has passed back to
 *     "Free Plan" and sends a "trial has ended" email.
 *
 * Only ever touches users with planSource === "trial" — a user who
 * upgraded and paid for real is never modified by this job.
 *
 * Security: Vercel automatically sends the CRON_SECRET env var as a
 * `Authorization: Bearer <CRON_SECRET>` header on every scheduled
 * invocation (see vercel.json). We reject anything else so this route
 * can't be triggered by a random request hitting the URL.
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

  const adminDb = getAdminDb();
  const now = Date.now();

  // Single equality filter (planSource == "trial") keeps this query index-free;
  // the small remaining logic (date comparisons, already-sent guards) runs in
  // memory, which is fine at trial-user volumes.
  const snap = await adminDb
    .collection("users")
    .where("planSource", "==", "trial")
    .get();

  let remindersSent = 0;
  let expiredReverted = 0;
  const errors: string[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const uid = docSnap.id;
    const email: string | undefined = data.email;
    const name: string = data.name || "there";
    const trialEndsAtMs: number | undefined = data.trialEndsAt?.toMillis?.();

    const action = decideTrialCronAction(
      {
        plan: data.plan,
        planSource: data.planSource,
        trialEndsAtMs,
        trialReminderSentAt: data.trialReminderSentAt,
        trialEndedEmailSentAt: data.trialEndedEmailSentAt,
      },
      now
    );

    if (action.type === "skip" || action.type === "wait") continue;

    try {
      if (action.type === "revert_and_email") {
        await docSnap.ref.update({
          plan: "Free Plan",
          trialEndedEmailSentAt: new Date(),
        });
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
      } else if (action.type === "revert_only") {
        // Already emailed previously but plan somehow still says Pro
        // (e.g. an earlier run's Firestore update failed after email send) —
        // safe to just fix the plan field without re-emailing.
        await docSnap.ref.update({ plan: "Free Plan" });
      } else if (action.type === "remind") {
        await docSnap.ref.update({ trialReminderSentAt: new Date() });
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
    checked: snap.size,
    remindersSent,
    expiredReverted,
    errors,
  });
}
