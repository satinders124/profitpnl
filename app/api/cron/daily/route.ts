import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { createServerClient } from "@/lib/supabase-server";
import { dailyPlanReminderEmailHtml } from "@/lib/email-daily-plan";
import { weeklyReviewReminderEmailHtml } from "@/lib/email-weekly-review";
import { logEmailEvent } from "@/lib/email-events";
import { GET as runTrialExpiry } from "@/app/api/cron/trial-expiry/route";

export const runtime = "nodejs";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  timezone: string | null;
  daily_plan_reminders_enabled: boolean | null;
  email_reports_enabled: boolean | null;
  daily_plan_reminder_sent_on: string | null;
  weekly_review_reminders_enabled: boolean | null;
  weekly_review_reminder_day: string | null;
  weekly_review_reminder_time: string | null;
  weekly_review_reminder_sent_on: string | null;
};

type TradeRow = {
  id?: string;
  date?: string | null;
  result: number | string | null;
  setup: string | null;
  emotion: string | null;
  mistake: string | null;
  reviewed?: boolean | null;
  lesson?: string | null;
};

type SendResult = {
  sent: boolean;
  skipped: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
};

const weekdayMap: Record<string, string> = {
  Mon: "Mon",
  Monday: "Mon",
  Tue: "Tue",
  Tuesday: "Tue",
  Wed: "Wed",
  Wednesday: "Wed",
  Thu: "Thu",
  Thursday: "Thu",
  Fri: "Fri",
  Friday: "Fri",
  Sat: "Sat",
  Saturday: "Sat",
  Sun: "Sun",
  Sunday: "Sun",
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";
}

function timezoneToIana(value?: string | null) {
  const clean = (value || "Australia/Brisbane").trim();
  const map: Record<string, string> = {
    UTC: "UTC",
    GMT: "Europe/London",
    EST: "America/New_York",
    CST: "America/Chicago",
    CET: "Europe/Berlin",
    JST: "Asia/Tokyo",
    AEST: "Australia/Sydney",
    AEDT: "Australia/Sydney",
    Brisbane: "Australia/Brisbane",
    "Australia/Brisbane": "Australia/Brisbane",
  };
  return map[clean] || clean || "Australia/Brisbane";
}

function localParts(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function parseReminderTime(value?: string | null) {
  const match = (value || "17:00").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: 17, minute: 0, text: "17:00" };
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return { hour, minute, text: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateMinusDays(localDate: string, days: number) {
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function startOfLocalWeek(localDate: string) {
  const date = new Date(`${localDate}T12:00:00Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function recentSummary(trades: TradeRow[]) {
  if (!trades.length) return "No recent trades logged. Today’s first job is to define your plan before the market defines it for you.";
  const totalR = trades.reduce((sum, trade) => sum + n(trade.result), 0);
  const losing = trades.filter((trade) => n(trade.result) < 0);
  const leak = losing.find((trade) => trade.mistake || trade.emotion);
  const sign = totalR >= 0 ? "+" : "";
  if (leak) return `Recent 7-day result: ${sign}${totalR.toFixed(2)}R. Watch ${leak.mistake || leak.emotion} today and lock a stop rule before your first trade.`;
  return `Recent 7-day result: ${sign}${totalR.toFixed(2)}R across ${trades.length} trade${trades.length === 1 ? "" : "s"}. Open your Daily Plan before entering.`;
}

function setupStats(trades: TradeRow[]) {
  const map = new Map<string, { name: string; totalR: number; count: number; wins: number }>();
  for (const trade of trades) {
    const setup = trade.setup || "Unassigned";
    const row = map.get(setup) || { name: setup, totalR: 0, count: 0, wins: 0 };
    const result = n(trade.result);
    row.totalR += result;
    row.count += 1;
    if (result > 0) row.wins += 1;
    map.set(setup, row);
  }
  return Array.from(map.values()).sort((a, b) => b.totalR - a.totalR);
}

function mainLeak(trades: TradeRow[]) {
  const map = new Map<string, { name: string; totalR: number; count: number }>();
  for (const trade of trades.filter((row) => n(row.result) < 0)) {
    const key = trade.mistake || trade.emotion || trade.setup || "Unclassified loss";
    const row = map.get(key) || { name: key, totalR: 0, count: 0 };
    row.totalR += n(trade.result);
    row.count += 1;
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => a.totalR - b.totalR)[0]?.name || "No major leak detected yet";
}

function reviewQueue(trades: TradeRow[]) {
  return trades.filter((trade) => trade.result !== null && trade.result !== undefined && trade.result !== "" && (!trade.reviewed || !trade.emotion || !trade.lesson)).length;
}

function emailNotConfigured(apiKey?: string, fromEmail?: string): SendResult | null {
  if (apiKey && fromEmail) return null;
  return { sent: false, skipped: true, reason: "email_not_configured" };
}

async function sendDailyPlanReminder({
  profile,
  supabase,
  apiKey,
  fromEmail,
  forceDaily = false,
}: {
  profile: ProfileRow;
  supabase: ReturnType<typeof createServerClient>;
  apiKey?: string;
  fromEmail?: string;
  forceDaily?: boolean;
}): Promise<SendResult> {
  if (!profile.email) return { sent: false, skipped: true, reason: "missing_email" };
  if (profile.daily_plan_reminders_enabled === false || profile.email_reports_enabled === false) {
    return {
      sent: false,
      skipped: true,
      reason: "disabled",
      metadata: {
        dailyPlanRemindersEnabled: profile.daily_plan_reminders_enabled !== false,
        emailReportsEnabled: profile.email_reports_enabled !== false,
      },
    };
  }

  const timeZone = timezoneToIana(profile.timezone);
  const local = localParts(timeZone);
  if (!forceDaily && profile.daily_plan_reminder_sent_on === local.date) return { sent: false, skipped: true, reason: "already_sent_today", metadata: { localDate: local.date, timeZone } };

  const { data: existingPlan } = await supabase.from("daily_plans").select("accepted_at").eq("user_id", profile.id).eq("plan_date", local.date).maybeSingle();
  if (existingPlan?.accepted_at) {
    await supabase.from("profiles").update({ daily_plan_reminder_sent_on: local.date }).eq("id", profile.id);
    return { sent: false, skipped: true, reason: "daily_plan_already_accepted", metadata: { localDate: local.date, timeZone } };
  }

  const configProblem = emailNotConfigured(apiKey, fromEmail);
  if (configProblem) return { ...configProblem, metadata: { localDate: local.date, timeZone, forceDaily } };

  const sevenDaysAgo = dateMinusDays(local.date, 7);
  const { data: trades } = await supabase.from("trades").select("result, setup, emotion, mistake").eq("user_id", profile.id).gte("date", sevenDaysAgo).order("date", { ascending: false }).limit(20);
  const summary = recentSummary((trades || []) as TradeRow[]);
  const dailyPlanUrl = `${appUrl()}/daily-plan`;

  await sgMail.send({
    to: profile.email,
    from: { email: fromEmail!, name: "ProfitPnL Daily Plan" },
    subject: "Your Daily Trading Plan isn’t locked yet",
    text: `Hi ${profile.display_name || "Trader"},\n\nWe haven’t found an accepted Daily Plan for today yet. ${summary}\n\nGenerate and lock your Daily Plan before you trade: ${dailyPlanUrl}\n\n— ProfitPnL`,
    html: dailyPlanReminderEmailHtml({ name: profile.display_name || "Trader", dailyPlanUrl, timezone: profile.timezone || timeZone, reminderTime: "08:00", recentSummary: summary }),
  });

  await supabase.from("profiles").update({ daily_plan_reminder_sent_on: local.date }).eq("id", profile.id);
  return { sent: true, skipped: false, metadata: { localDate: local.date, timeZone, forceDaily, recentTradesChecked: (trades || []).length } };
}

async function sendWeeklyReviewReminder({
  profile,
  supabase,
  apiKey,
  fromEmail,
}: {
  profile: ProfileRow;
  supabase: ReturnType<typeof createServerClient>;
  apiKey?: string;
  fromEmail?: string;
}): Promise<SendResult> {
  if (!profile.email) return { sent: false, skipped: true, reason: "missing_email" };
  if (profile.weekly_review_reminders_enabled === false || profile.email_reports_enabled === false) {
    return {
      sent: false,
      skipped: true,
      reason: "disabled",
      metadata: {
        weeklyReviewRemindersEnabled: profile.weekly_review_reminders_enabled !== false,
        emailReportsEnabled: profile.email_reports_enabled !== false,
      },
    };
  }

  const timeZone = timezoneToIana(profile.timezone);
  const local = localParts(timeZone);
  const targetDay = weekdayMap[profile.weekly_review_reminder_day || "Fri"] || "Fri";
  const targetTime = parseReminderTime(profile.weekly_review_reminder_time);

  // Vercel Hobby runs our unified cron once per day. Weekly reports must not
  // catch up on later days, otherwise users can receive a Weekly Report when
  // they expected the Daily Plan reminder. Send only on the configured weekday.
  if (local.weekday !== targetDay) {
    return {
      sent: false,
      skipped: true,
      reason: "not_weekly_report_day",
      metadata: { localDate: local.date, localWeekday: local.weekday, targetDay, targetTime: targetTime.text, timeZone },
    };
  }

  const reportEndDate = local.date;

  if (profile.weekly_review_reminder_sent_on === reportEndDate) {
    return { sent: false, skipped: true, reason: "already_sent_for_period", metadata: { reportEndDate, targetDay, targetTime: targetTime.text, timeZone } };
  }

  const configProblem = emailNotConfigured(apiKey, fromEmail);
  if (configProblem) return { ...configProblem, metadata: { reportEndDate, targetDay, targetTime: targetTime.text, timeZone } };

  const weekStart = startOfLocalWeek(reportEndDate);
  const { data: trades } = await supabase
    .from("trades")
    .select("id, date, result, setup, emotion, mistake, reviewed, lesson")
    .eq("user_id", profile.id)
    .gte("date", weekStart)
    .lte("date", reportEndDate)
    .order("date", { ascending: false });

  const rows = (trades || []) as TradeRow[];
  const closed = rows.filter((trade) => trade.result !== null && trade.result !== undefined && trade.result !== "");
  const wins = closed.filter((trade) => n(trade.result) > 0).length;
  const totalR = closed.reduce((sum, trade) => sum + n(trade.result), 0);
  const ranked = setupStats(closed);
  const weeklyReviewUrl = `${appUrl()}/weekly-review`;

  await sgMail.send({
    to: profile.email,
    from: { email: fromEmail!, name: "ProfitPnL Weekly Report" },
    subject: `Your Weekly ProfitPnL Report is ready (${totalR >= 0 ? "+" : ""}${totalR.toFixed(2)}R)`,
    text: `Hi ${profile.display_name || "Trader"},\n\nYour weekly ProfitPnL report is ready for ${weekStart} to ${reportEndDate}. Closed trades: ${closed.length}. Total result: ${totalR >= 0 ? "+" : ""}${totalR.toFixed(2)}R. Open: ${weeklyReviewUrl}\n\n— ProfitPnL`,
    html: weeklyReviewReminderEmailHtml({
      name: profile.display_name || "Trader",
      weeklyReviewUrl,
      timezone: profile.timezone || timeZone,
      periodLabel: `${weekStart} to ${reportEndDate}`,
      totalTrades: closed.length,
      totalR,
      winRate: closed.length ? wins / closed.length : 0,
      bestSetup: ranked[0]?.name || "Not enough setup data yet",
      mainLeak: mainLeak(closed),
      reviewQueue: reviewQueue(rows),
    }),
  });

  await supabase.from("profiles").update({ weekly_review_reminder_sent_on: reportEndDate }).eq("id", profile.id);
  return {
    sent: true,
    skipped: false,
    metadata: {
      weekStart,
      reportEndDate,
      totalTrades: closed.length,
      totalR,
      winRate: closed.length ? wins / closed.length : 0,
      reviewQueue: reviewQueue(rows),
      targetDay,
      targetTime: targetTime.text,
      timeZone,
    },
  };
}

function countSkipReason(result: SendResult, skipReasons: Record<string, number>) {
  if (!result.skipped) return;
  const reason = result.reason || "skipped";
  skipReasons[reason] = (skipReasons[reason] || 0) + 1;
}

async function logCronEmailResult({
  supabase,
  profile,
  eventType,
  result,
  emailConfigured,
}: {
  supabase: ReturnType<typeof createServerClient>;
  profile: ProfileRow;
  eventType: "daily_plan_reminder" | "weekly_report";
  result: SendResult;
  emailConfigured: boolean;
}) {
  await logEmailEvent(supabase, {
    userId: profile.id,
    recipientEmail: profile.email,
    eventType,
    status: result.sent ? "sent" : "skipped",
    reason: result.reason || null,
    source: "cron_daily",
    metadata: {
      emailConfigured,
      timezone: profile.timezone || null,
      ...result.metadata,
    },
  });
}

async function logCronEmailFailure({
  supabase,
  profile,
  eventType,
  error,
  emailConfigured,
}: {
  supabase: ReturnType<typeof createServerClient>;
  profile: ProfileRow;
  eventType: "daily_plan_reminder" | "weekly_report";
  error: unknown;
  emailConfigured: boolean;
}) {
  const message = error instanceof Error ? error.message : String(error);
  await logEmailEvent(supabase, {
    userId: profile.id,
    recipientEmail: profile.email,
    eventType,
    status: "failed",
    reason: "send_failed",
    providerMessage: message,
    source: "cron_daily",
    metadata: {
      emailConfigured,
      timezone: profile.timezone || null,
    },
  });
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const only = url.searchParams.get("only") || "all";
  const forceDaily = url.searchParams.get("forceDaily") === "1" || url.searchParams.get("forceDaily") === "true";
  const runDaily = only === "all" || only === "daily";
  const runWeekly = only === "all" || only === "weekly";

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (apiKey) sgMail.setApiKey(apiKey);

  const supabase = createServerClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, timezone, daily_plan_reminders_enabled, email_reports_enabled, daily_plan_reminder_sent_on, weekly_review_reminders_enabled, weekly_review_reminder_day, weekly_review_reminder_time, weekly_review_reminder_sent_on");

  if (error) {
    console.error("Daily cron profile fetch error:", error);
    return NextResponse.json({ error: "Could not fetch profiles." }, { status: 500 });
  }

  let dailySent = 0;
  let weeklySent = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};
  const errors: string[] = [];

  const emailConfigured = Boolean(apiKey && fromEmail);

  for (const profile of (profiles || []) as ProfileRow[]) {
    if (runDaily) {
      try {
        const daily = await sendDailyPlanReminder({ profile, supabase, apiKey, fromEmail, forceDaily });
        if (daily.sent) dailySent++;
        if (daily.skipped) skipped++;
        countSkipReason(daily, skipReasons);
        await logCronEmailResult({ supabase, profile, eventType: "daily_plan_reminder", result: daily, emailConfigured });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${profile.id} daily_plan_reminder: ${message}`);
        await logCronEmailFailure({ supabase, profile, eventType: "daily_plan_reminder", error: err, emailConfigured });
      }
    }

    if (runWeekly) {
      try {
        const weekly = await sendWeeklyReviewReminder({ profile, supabase, apiKey, fromEmail });
        if (weekly.sent) weeklySent++;
        if (weekly.skipped) skipped++;
        countSkipReason(weekly, skipReasons);
        await logCronEmailResult({ supabase, profile, eventType: "weekly_report", result: weekly, emailConfigured });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${profile.id} weekly_report: ${message}`);
        await logCronEmailFailure({ supabase, profile, eventType: "weekly_report", error: err, emailConfigured });
      }
    }
  }

  const trialRes = await runTrialExpiry(req).catch((error) => {
    errors.push(`trial-expiry: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  const trial = trialRes ? await trialRes.json().catch(() => null) : null;

  return NextResponse.json({
    ok: true,
    checked: profiles?.length || 0,
    emailConfigured,
    only,
    forceDaily,
    dailySent,
    weeklySent,
    skipped,
    skipReasons,
    trial,
    errors,
  });
}
