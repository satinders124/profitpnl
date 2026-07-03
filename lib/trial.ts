import { doc, getDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase-client";

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
 */
export async function startFreeTrial(uid: string): Promise<number> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().hasUsedTrial) {
    throw new TrialAlreadyUsedError();
  }

  const trialEndsAtMs = Date.now() + TRIAL_DURATION_MS;

  await updateDoc(ref, {
    trialStartedAt: serverTimestamp(),
    trialEndsAt: Timestamp.fromMillis(trialEndsAtMs),
    hasUsedTrial: true,
  });

  return trialEndsAtMs;
}
