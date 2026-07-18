import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { createServerClient } from "@/lib/supabase-server";
import { dailyPlanReminderEmailHtml } from "@/lib/email-daily-plan";
import { weeklyReviewReminderEmailHtml } from "@/lib/email-weekly-review";
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

const weekdayMap: Record<string, string> = {
  Mon: "Mon", Monday: "Mon",
  Tue: "Tue", Tuesday: "Tue",
  Wed: "Wed", Wednesday: "Wed",
  Thu: "Thu", Thursday: "Thu",
  Fri: "Fri", Friday: "Fri",
  Sat: "Sat", Saturday: "Sat",
  Sun: "Sun", Sunday: "Sun",
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
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: get("weekday") };
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
  return trades.filter((trade) => !trade.reviewed || !trade.emotion || !trade.lesson).length;
}

async function sendDailyPlanReminder({ profile, supabase, apiKey, fromEmail }: { profile: ProfileRow; supabase: ReturnType<typeof createServerClient>; apiKey?: string; fromEmail?: string }) {
  if (!profile.email || profile.daily_plan_reminders_enabled === false || profile.email_reports_enabled === false) return { sent: false, skipped: true };
  const timeZone = timezoneToIana(profile.timezone);
  const local = localParts(timeZone);
  if (profile.daily_plan_reminder_sent_on === local.date) return { sent: false, skipped: true };

  const { data: existingPlan } = await supabase.from("daily_plans").select("accepted_at").eq("user_id", profile.id).eq("plan_date", local.date).maybeSingle();
  if (existingPlan?.accepted_at) {
    await supabase.from("profiles").update({ daily_plan_reminder_sent_on: local.date }).eq("id", profile.id);
    return { sent: false, skipped: true };
  }

  const sevenDaysAgo = dateMinusDays(local.date, 7);
  const { data: trades } = await supabase.from("trades").select("result, setup, emotion, mistake").eq("user_id", profile.id).gte("date", sevenDaysAgo).order("date", { ascending: false }).limit(20);
  const summary = recentSummary((trades || []) as TradeRow[]);
  const dailyPlanUrl = `${appUrl()}/daily-plan`;

  if (apiKey && fromEmail) {
    await sgMail.send({
      to: profile.email,
      from: { email: fromEmail, name: "ProfitPnL Daily Plan" },
      subject: "Your Daily Trading Plan is ready",
      text: `Hi ${profile.display_name || "Trader"},\n\n${summary}\n\nOpen your Daily Plan before you trade: ${dailyPlanUrl}\n\n— ProfitPnL`,
      html: dailyPlanReminderEmailHtml({ name: profile.display_name || "Trader", dailyPlanUrl, timezone: profile.timezone || timeZone, reminderTime: "08:00", recentSummary: summary }),
    });
  }

  await supabase.from("profiles").update({ daily_plan_reminder_sent_on: local.date }).eq("id", profile.id);
  return { sent: true, skipped: false };
}

async function sendWeeklyReviewReminder({ profile, supabase, apiKey, fromEmail }: { profile: ProfileRow; supabase: ReturnType<typeof createServerClient>; apiKey?: string; fromEmail?: string }) {
  if (!profile.email || profile.weekly_review_reminders_enabled === false || profile.email_reports_enabled === false) return { sent: false, skipped: true };
  const timeZone = timezoneToIana(profile.timezone);
  const local = localParts(timeZone);
  const targetDay = weekdayMap[profile.weekly_review_reminder_day || "Fri"] || "Fri";
  if (local.weekday !== targetDay) return { sent: false, skipped: true };
  if (profile.weekly_review_reminder_sent_on === local.date) return { sent: false, skipped: true };

  const weekStart = startOfLocalWeek(local.date);
  const { data: trades } = await supabase.from("trades").select("id, date, result, setup, emotion, mistake, reviewed, lesson").eq("user_id", profile.id).gte("date", weekStart).lte("date", local.date).order("date", { ascending: false });
  const rows = (trades || []) as TradeRow[];
  const closed = rows.filter((trade) => trade.result !== null && trade.result !== undefined && trade.result !== "");
  const wins = closed.filter((trade) => n(trade.result) > 0).length;
  const totalR = closed.reduce((sum, trade) => sum + n(trade.result), 0);
  const ranked = setupStats(closed);
  const weeklyReviewUrl = `${appUrl()}/weekly-review`;

  if (apiKey && fromEmail) {
    await sgMail.send({
      to: profile.email,
      from: { email: fromEmail, name: "ProfitPnL Weekly Review" },
      subject: "Your Weekly Trading Review is ready",
      text: `Hi ${profile.display_name || "Trader"},\n\nYour weekly review is ready. Closed trades: ${closed.length}. Total result: ${totalR >= 0 ? "+" : ""}${totalR.toFixed(2)}R. Open: ${weeklyReviewUrl}\n\n— ProfitPnL`,
      html: weeklyReviewReminderEmailHtml({ name: profile.display_name || "Trader", weeklyReviewUrl, timezone: profile.timezone || timeZone, periodLabel: `${weekStart} to ${local.date}`, totalTrades: closed.length, totalR, winRate: closed.length ? wins / closed.length : 0, bestSetup: ranked[0]?.name || "Not enough setup data yet", mainLeak: mainLeak(closed), reviewQueue: reviewQueue(rows) }),
    });
  }

  await supabase.from("profiles").update({ weekly_review_reminder_sent_on: local.date }).eq("id", profile.id);
  return { sent: true, skipped: false };
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (apiKey) sgMail.setApiKey(apiKey);
  const supabase = createServerClient();
  const { data: profiles, error } = await supabase.from("profiles").select("id, email, display_name, timezone, daily_plan_reminders_enabled, email_reports_enabled, daily_plan_reminder_sent_on, weekly_review_reminders_enabled, weekly_review_reminder_day, weekly_review_reminder_sent_on");
  if (error) {
    console.error("Daily cron profile fetch error:", error);
    return NextResponse.json({ error: "Could not fetch profiles." }, { status: 500 });
  }

  let dailySent = 0;
  let weeklySent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const profile of (profiles || []) as ProfileRow[]) {
    try {
      const daily = await sendDailyPlanReminder({ profile, supabase, apiKey, fromEmail });
      if (daily.sent) dailySent++; else if (daily.skipped) skipped++;
      const weekly = await sendWeeklyReviewReminder({ profile, supabase, apiKey, fromEmail });
      if (weekly.sent) weeklySent++; else if (weekly.skipped) skipped++;
    } catch (err) {
      errors.push(`${profile.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const trialRes = await runTrialExpiry(req).catch((error) => {
    errors.push(`trial-expiry: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  const trial = trialRes ? await trialRes.json().catch(() => null) : null;

  return NextResponse.json({ ok: true, checked: profiles?.length || 0, dailySent, weeklySent, skipped, trial, errors });
}
