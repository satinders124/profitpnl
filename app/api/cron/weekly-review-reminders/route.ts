import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { createServerClient } from "@/lib/supabase-server";
import { weeklyReviewReminderEmailHtml } from "@/lib/email-weekly-review";

export const runtime = "nodejs";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  timezone: string | null;
  weekly_review_reminders_enabled: boolean | null;
  weekly_review_reminder_day: string | null;
  weekly_review_reminder_time: string | null;
  email_reports_enabled: boolean | null;
  weekly_review_reminder_sent_on: string | null;
};

type TradeRow = {
  id: string;
  date: string | null;
  result: number | string | null;
  setup: string | null;
  emotion: string | null;
  mistake: string | null;
  reviewed: boolean | null;
  lesson: string | null;
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
  const clean = (value || "UTC").trim();
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
  return map[clean] || clean || "UTC";
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

function isWithinReminderWindow(profile: ProfileRow, now = new Date()) {
  const timeZone = timezoneToIana(profile.timezone);
  const local = localParts(timeZone, now);
  const target = parseReminderTime(profile.weekly_review_reminder_time);
  const targetDay = weekdayMap[profile.weekly_review_reminder_day || "Fri"] || "Fri";
  const localMinutes = local.hour * 60 + local.minute;
  const targetMinutes = target.hour * 60 + target.minute;
  const diff = localMinutes - targetMinutes;
  return {
    shouldSend: local.weekday === targetDay && diff >= 0 && diff < 30 && profile.weekly_review_reminder_sent_on !== local.date,
    localDate: local.date,
    timeZone,
    reminderTime: target.text,
  };
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfLocalWeek(localDate: string) {
  const date = new Date(`${localDate}T12:00:00Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
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
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, timezone, weekly_review_reminders_enabled, weekly_review_reminder_day, weekly_review_reminder_time, email_reports_enabled, weekly_review_reminder_sent_on")
    .eq("weekly_review_reminders_enabled", true)
    .eq("email_reports_enabled", true);

  if (error) {
    console.error("Weekly review reminders profile fetch error:", error);
    return NextResponse.json({ error: "Could not fetch reminder profiles." }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const profile of (profiles || []) as ProfileRow[]) {
    if (!profile.email) {
      skipped++;
      continue;
    }

    const timing = isWithinReminderWindow(profile);
    if (!timing.shouldSend) {
      skipped++;
      continue;
    }

    try {
      const weekStart = startOfLocalWeek(timing.localDate);
      const { data: trades } = await supabase
        .from("trades")
        .select("id, date, result, setup, emotion, mistake, reviewed, lesson")
        .eq("user_id", profile.id)
        .gte("date", weekStart)
        .lte("date", timing.localDate)
        .order("date", { ascending: false });

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
          html: weeklyReviewReminderEmailHtml({
            name: profile.display_name || "Trader",
            weeklyReviewUrl,
            timezone: profile.timezone || timing.timeZone,
            periodLabel: `${weekStart} to ${timing.localDate}`,
            totalTrades: closed.length,
            totalR,
            winRate: closed.length ? wins / closed.length : 0,
            bestSetup: ranked[0]?.name || "Not enough setup data yet",
            mainLeak: mainLeak(closed),
            reviewQueue: reviewQueue(rows),
          }),
        });
      }

      await supabase.from("profiles").update({ weekly_review_reminder_sent_on: timing.localDate }).eq("id", profile.id);
      sent++;
    } catch (err) {
      errors.push(`${profile.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, checked: profiles?.length || 0, sent, skipped, errors });
}
