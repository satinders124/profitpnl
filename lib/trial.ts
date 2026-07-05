import { createServerClient } from "@/lib/supabase-server";

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const TRIAL_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours before expiry

export type TrialUserRecord = {
  plan?: string;
  planSource?: string;
  trialEndsAtMs?: number;
  trialReminderSentAt?: unknown;
  trialEndedEmailSentAt?: unknown;
};

export type TrialCronAction =
  | { type: "skip" }
  | { type: "revert_and_email"; alreadyEmailed: false }
  | { type: "revert_only" }
  | { type: "remind" }
  | { type: "wait" };

/**
 * Pure decision function for the daily trial-expiry cron job.
 * No database calls — just logic based on the user's trial fields.
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
  eligible: boolean;
  plan: string;
  hasUsedTrial: boolean;
};

/**
 * Checks whether a user can start a free trial.
 * Server-side only (uses service role key).
 */
export async function getTrialEligibility(uid: string): Promise<TrialEligibility> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("plan, plan_source, has_used_trial")
    .eq("id", uid)
    .single();

  if (error || !data) {
    return { eligible: true, plan: "Free Plan", hasUsedTrial: false };
  }

  const plan = data.plan || "Free Plan";
  const hasUsedTrial = !!data.has_used_trial;

  return {
    eligible: plan === "Free Plan" && !hasUsedTrial,
    plan,
    hasUsedTrial,
  };
}

/**
 * Starts a 7-day, no-card-required Pro trial for the given user.
 * Server-side only (uses service role key).
 */
export async function startFreeTrial(uid: string): Promise<number> {
  const supabase = createServerClient();

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("has_used_trial")
    .eq("id", uid)
    .single();

  if (fetchError || !profile) {
    throw new Error("User not found");
  }

  if (profile.has_used_trial) {
    throw new TrialAlreadyUsedError();
  }

  const trialEndsAtMs = Date.now() + TRIAL_DURATION_MS;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      plan: "Pro Plan",
      plan_source: "trial",
      trial_started_at: new Date().toISOString(),
      trial_ends_at: new Date(trialEndsAtMs).toISOString(),
      trial_reminder_sent_at: null,
      trial_ended_email_sent_at: null,
      has_used_trial: true,
    })
    .eq("id", uid);

  if (updateError) {
    throw new Error("Failed to start trial: " + updateError.message);
  }

  return trialEndsAtMs;
}
