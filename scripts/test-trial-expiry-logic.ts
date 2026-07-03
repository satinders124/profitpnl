/**
 * Standalone test harness for decideTrialCronAction() — the pure decision
 * function used by app/api/cron/trial-expiry/route.ts. Not part of the
 * Next.js app bundle. Run with: npx tsx scripts/test-trial-expiry-logic.ts
 */
import { decideTrialCronAction, TrialCronAction, TrialUserRecord } from "../lib/trial";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

type Case = {
  name: string;
  user: TrialUserRecord;
  now: number;
  expected: TrialCronAction["type"];
};

const cases: Case[] = [
  {
    name: "Free Plan, never trialed -> skip",
    user: { plan: "Free Plan" },
    now: NOW,
    expected: "skip",
  },
  {
    name: "Paid Pro user (planSource unset) -> skip (never touched by trial job)",
    user: { plan: "Pro Plan", trialEndsAtMs: NOW - DAY }, // even if some stale trial date exists
    now: NOW,
    expected: "skip",
  },
  {
    name: "Paid Pro user with planSource explicitly 'paid' -> skip",
    user: { plan: "Pro Plan", planSource: "paid", trialEndsAtMs: NOW - DAY },
    now: NOW,
    expected: "skip",
  },
  {
    name: "Active trial, 5 days remaining -> wait",
    user: { plan: "Pro Plan", planSource: "trial", trialEndsAtMs: NOW + 5 * DAY },
    now: NOW,
    expected: "wait",
  },
  {
    name: "Active trial, exactly at 24h boundary -> remind",
    user: { plan: "Pro Plan", planSource: "trial", trialEndsAtMs: NOW + DAY },
    now: NOW,
    expected: "remind",
  },
  {
    name: "Active trial, 23h50m remaining, not yet reminded -> remind",
    user: { plan: "Pro Plan", planSource: "trial", trialEndsAtMs: NOW + DAY - 10 * 60 * 1000 },
    now: NOW,
    expected: "remind",
  },
  {
    name: "Active trial, 23h50m remaining, already reminded -> wait (no duplicate)",
    user: {
      plan: "Pro Plan",
      planSource: "trial",
      trialEndsAtMs: NOW + DAY - 10 * 60 * 1000,
      trialReminderSentAt: new Date(NOW - 1000),
    },
    now: NOW,
    expected: "wait",
  },
  {
    name: "Trial expired 1 minute ago, never emailed -> revert_and_email",
    user: { plan: "Pro Plan", planSource: "trial", trialEndsAtMs: NOW - 60 * 1000 },
    now: NOW,
    expected: "revert_and_email",
  },
  {
    name: "Trial expired exactly now (msRemaining === 0) -> revert_and_email",
    user: { plan: "Pro Plan", planSource: "trial", trialEndsAtMs: NOW },
    now: NOW,
    expected: "revert_and_email",
  },
  {
    name: "Trial expired days ago, already emailed, plan still Pro (repair case) -> revert_only",
    user: {
      plan: "Pro Plan",
      planSource: "trial",
      trialEndsAtMs: NOW - 3 * DAY,
      trialEndedEmailSentAt: new Date(NOW - 3 * DAY),
    },
    now: NOW,
    expected: "revert_only",
  },
  {
    name: "Already reverted to Free Plan after expiry -> skip (job never re-touches it)",
    user: {
      plan: "Free Plan",
      planSource: "trial",
      trialEndsAtMs: NOW - 3 * DAY,
      trialEndedEmailSentAt: new Date(NOW - 3 * DAY),
    },
    now: NOW,
    expected: "skip",
  },
  {
    name: "planSource trial but no trialEndsAt set (corrupt data) -> skip, not crash",
    user: { plan: "Pro Plan", planSource: "trial" },
    now: NOW,
    expected: "skip",
  },
  {
    name: "Reminder already sent AND now past expiry -> revert_and_email (independent of reminder flag)",
    user: {
      plan: "Pro Plan",
      planSource: "trial",
      trialEndsAtMs: NOW - 60 * 1000,
      trialReminderSentAt: new Date(NOW - DAY),
      trialEndedEmailSentAt: undefined,
    },
    now: NOW,
    expected: "revert_and_email",
  },
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  const result = decideTrialCronAction(c.user, c.now);
  const ok = result.type === c.expected;
  console.log(`${ok ? "✅" : "❌"} ${c.name} -> got "${result.type}", expected "${c.expected}"`);
  if (ok) pass++;
  else fail++;
}

console.log(`\n${pass}/${cases.length} passed`);
if (fail > 0) {
  console.error(`${fail} test(s) FAILED`);
  process.exit(1);
}
