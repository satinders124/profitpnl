import { doc, getDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const TRIAL_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours before expiry

export type TrialUserRecord = {
  plan?: string;
  planSource?: string;
  trialEndsAtMs?: number; // trialEndsAt.toMillis()
  trialReminderSentAt?: unknown; // any truthy value means "already sent"
  trialEndedEmailSentAt?: unknown;
};

export type TrialCronAction =
  | { type: "skip" } // not an active trial user, nothing to do
  | { type: "revert_and_email"; alreadyEmailed: false } // expired, first time -> update plan + send email
  | { type: "revert_only" } // expired, email already sent previously (repair-only pass)
  | { type: "remind" } // within reminder window, not yet reminded
  | { type: "wait" }; // active trial, not yet due for reminder or expiry

/**
 * Pure decision function for the daily trial-expiry cron job — given a
 * user's current trial-related fields and "now", decides exactly one
 * action to take. Kept separate from Firestore/SendGrid I/O so it can be
 * unit tested directly (see scripts/test-trial-expiry-logic.ts).
 */
export function decideTrialCronAction(
  user: TrialUserRecord,
  nowMs: number
): TrialCronAction {
  if (user.planSource !== "trial" || user.plan !== "Pro Plan" || !user.trialEndsAtMs) {
    return { type: "skip" };
  }

  const msRemaining = user.trialEndsAtMs - nowMs;

  if (msRemaining <= 0) {
    return user.trialEndedEmailSentAt
      ? { type: "revert_only" }
      : { type: "revert_and_email", alreadyEmailed: false };
  }

  if (msRemaining <= TRIAL_REMINDER_WINDOW_MS && !user.trialReminderSentAt) {
    return { type: "remind" };
  }

  return { type: "wait" };
}

export class TrialAlreadyUsedError extends Error {
  constructor() {
    super("Your free trial has already been used on this account.");
    this.name = "TrialAlreadyUsedError";
  }
}

export type TrialEligibility = {
  eligible: boolean; // Free plan, never used a trial before
  plan: string;
  hasUsedTrial: boolean;
};

/**
 * Checks whether a user can start a free trial, without requiring
 * AuthProvider context — safe to call right after login, before the
 * app shell / dashboard have loaded any plan state.
 */
export async function getTrialEligibility(uid: string): Promise<TrialEligibility> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { eligible: true, plan: "Free Plan", hasUsedTrial: false };
  }

  const data = snap.data();
  const plan = data.plan || "Free Plan";
  const hasUsedTrial = !!data.hasUsedTrial;

  return {
    eligible: plan === "Free Plan" && !hasUsedTrial,
    plan,
    hasUsedTrial,
  };
}

/**
 * Starts a 7-day, no-card-required Pro trial for the given user.
 * Each account may only start a trial once (tracked via hasUsedTrial).
 *
 * IMPORTANT: this grants real Pro access for the trial window by setting
 * plan: "Pro Plan" (previously this only recorded dates and never actually
 * unlocked anything — a real bug). `planSource: "trial"` is stamped so the
 * daily expiry job (app/api/cron/trial-expiry/route.ts) knows it's safe to
 * automatically revert this specific user back to Free Plan once
 * trialEndsAt passes — it will never touch a user who paid directly
 * (planSource would be "paid"/unset for those).
 */
export async function startFreeTrial(uid: string): Promise<number> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().hasUsedTrial) {
    throw new TrialAlreadyUsedError();
  }

  const trialEndsAtMs = Date.now() + TRIAL_DURATION_MS;

  await updateDoc(ref, {
    plan: "Pro Plan",
    planSource: "trial",
    trialStartedAt: serverTimestamp(),
    trialEndsAt: Timestamp.fromMillis(trialEndsAtMs),
    trialReminderSentAt: null,
    trialEndedEmailSentAt: null,
    hasUsedTrial: true,
  });

  return trialEndsAtMs;
}
