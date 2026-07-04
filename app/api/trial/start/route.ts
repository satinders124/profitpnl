import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// Inline constant — avoids importing lib/trial.ts which pulls in
// client-side Firebase SDK (breaks server-side build without env vars).
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * POST /api/trial/start
 *
 * Starts a 7-day no-card-required Pro trial for the given user.
 * Each account may only start a trial once (tracked via hasUsedTrial).
 *
 * This uses firebase-admin (server-side) to update the user doc directly,
 * granting real Pro access for the trial window.
 *
 * The daily cron job (app/api/cron/trial-expiry) handles:
 * - 24h-before-expiry reminder email
 * - Automatic reversion to Free Plan when trial ends
 *
 * Accepts: { uid }
 * Returns: { ok: true, trialEndsAtMs }
 */
export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "Missing uid" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Create the user doc if it doesn't exist yet (edge case)
      const trialEndsAtMs = Date.now() + TRIAL_DURATION_MS;
      await adminDb.collection("users").doc(uid).set({
        plan: "Pro Plan",
        planSource: "trial",
        trialStartedAt: new Date(),
        trialEndsAt: new Date(trialEndsAtMs),
        trialReminderSentAt: null,
        trialEndedEmailSentAt: null,
        hasUsedTrial: true,
      });
      return NextResponse.json({ ok: true, trialEndsAtMs });
    }

    const data = userDoc.data();

    // Check if trial was already used
    if (data?.hasUsedTrial) {
      return NextResponse.json(
        { error: "Your free trial has already been used on this account." },
        { status: 403 }
      );
    }

    // Check if already Pro (paid)
    if (data?.plan === "Pro Plan" && data?.planSource === "paid") {
      return NextResponse.json(
        { error: "You are already on a paid Pro plan." },
        { status: 400 }
      );
    }

    const trialEndsAtMs = Date.now() + TRIAL_DURATION_MS;

    await adminDb.collection("users").doc(uid).update({
      plan: "Pro Plan",
      planSource: "trial",
      trialStartedAt: new Date(),
      trialEndsAt: new Date(trialEndsAtMs),
      trialReminderSentAt: null,
      trialEndedEmailSentAt: null,
      hasUsedTrial: true,
    });

    return NextResponse.json({ ok: true, trialEndsAtMs });
  } catch (error) {
    console.error("Trial start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
