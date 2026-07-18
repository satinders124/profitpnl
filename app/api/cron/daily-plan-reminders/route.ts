import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { createServerClient } from "@/lib/supabase-server";
import { dailyPlanReminderEmailHtml } from "@/lib/email-daily-plan";

export const runtime = "nodejs";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  timezone: string | null;
  daily_plan_reminders_enabled: boolean | null;
  daily_plan_reminder_time: string | null;
  email_reports_enabled: boolean | null;
  daily_plan_reminder_sent_on: string | null;
};

type TradeRow = {
  result: number | string | null;
  setup: string | null;
  emotion: string | null;
  mistake: string | null;
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
  const match = (value || "08:00").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: 8, minute: 0, text: "08:00" };
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return { hour, minute, text: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function isWithinReminderWindow(profile: ProfileRow, now = new Date()) {
  const timeZone = timezoneToIana(profile.timezone);
  const local = localParts(timeZone, now);
  const target = parseReminderTime(profile.daily_plan_reminder_time);
  const localMinutes = local.hour * 60 + local.minute;
  const targetMinutes = target.hour * 60 + target.minute;
  const diff = localMinutes - targetMinutes;
  const weekdayAllowed = !["Sat", "Sun"].includes(local.weekday);
  return {
    shouldSend: weekdayAllowed && diff >= 0 && diff < 30 && profile.daily_plan_reminder_sent_on !== local.date,
    localDate: local.date,
    timeZone,
    reminderTime: target.text,
  };
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function recentSummary(trades: TradeRow[]) {
  if (!trades.length) return "No recent trades logged. Today’s first job is to define your plan before the market defines it for you.";
  const totalR = trades.reduce((sum, trade) => sum + n(trade.result), 0);
  const losing = trades.filter((trade) => n(trade.result) < 0);
  const leak = losing.find((trade) => trade.mistake || trade.emotion);
  const sign = totalR >= 0 ? "+" : "";
  if (leak) {
    return `Recent 7-day result: ${sign}${totalR.toFixed(2)}R. Watch ${leak.mistake || leak.emotion} today and lock a stop rule before your first trade.`;
  }
  return `Recent 7-day result: ${sign}${totalR.toFixed(2)}R across ${trades.length} trade${trades.length === 1 ? "" : "s"}. Open your Daily Plan before entering.`;
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
    .select("id, email, display_name, timezone, daily_plan_reminders_enabled, daily_plan_reminder_time, email_reports_enabled, daily_plan_reminder_sent_on")
    .eq("daily_plan_reminders_enabled", true)
    .eq("email_reports_enabled", true);

  if (error) {
    console.error("Daily plan reminders profile fetch error:", error);
    return NextResponse.json({ error: "Could not fetch reminder profiles." }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
      const { data: existingPlan } = await supabase
        .from("daily_plans")
        .select("accepted_at")
        .eq("user_id", profile.id)
        .eq("plan_date", timing.localDate)
        .maybeSingle();

      if (existingPlan?.accepted_at) {
        await supabase.from("profiles").update({ daily_plan_reminder_sent_on: timing.localDate }).eq("id", profile.id);
        skipped++;
        continue;
      }

      const { data: trades } = await supabase
        .from("trades")
        .select("result, setup, emotion, mistake")
        .eq("user_id", profile.id)
        .gte("date", sevenDaysAgo)
        .order("date", { ascending: false })
        .limit(20);

      const summary = recentSummary((trades || []) as TradeRow[]);
      const dailyPlanUrl = `${appUrl()}/daily-plan`;

      if (apiKey && fromEmail) {
        await sgMail.send({
          to: profile.email,
          from: { email: fromEmail, name: "ProfitPnL Daily Plan" },
          subject: "Your Daily Trading Plan is ready",
          text: `Hi ${profile.display_name || "Trader"},\n\n${summary}\n\nOpen your Daily Plan before you trade: ${dailyPlanUrl}\n\n— ProfitPnL`,
          html: dailyPlanReminderEmailHtml({
            name: profile.display_name || "Trader",
            dailyPlanUrl,
            timezone: profile.timezone || timing.timeZone,
            reminderTime: timing.reminderTime,
            recentSummary: summary,
          }),
        });
      }

      await supabase.from("profiles").update({ daily_plan_reminder_sent_on: timing.localDate }).eq("id", profile.id);
      sent++;
    } catch (err) {
      errors.push(`${profile.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ ok: true, checked: profiles?.length || 0, sent, skipped, errors });
}
