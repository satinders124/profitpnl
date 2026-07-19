import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { requireAdmin } from "@/lib/affiliates";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import { dailyPlanReminderEmailHtml } from "@/lib/email-daily-plan";
import { weeklyReviewReminderEmailHtml } from "@/lib/email-weekly-review";

export const runtime = "nodejs";

type EmailOpsPayload = {
  action?: unknown;
  testEmail?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : "";
}

function maskSecret(value?: string | null) {
  if (!value) return null;
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function statusFromError(message: string) {
  if (message === "Forbidden") return 403;
  if (message.toLowerCase().includes("authorization") || message.toLowerCase().includes("session")) return 401;
  return 500;
}

async function assertAdmin(req: Request) {
  const user = await getAuthenticatedUser(req);
  requireAdmin(user);
  return user;
}

export async function GET(req: Request) {
  try {
    await assertAdmin(req);
    const supabase = createServerClient();
    const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });

    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL;
    const cronSecret = process.env.CRON_SECRET;
    const url = appUrl();

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      totalProfiles: count || 0,
      appUrl: url,
      env: {
        sendgridApiKeyConfigured: Boolean(sendgridApiKey),
        sendgridApiKeyPreview: maskSecret(sendgridApiKey),
        sendgridFromEmailConfigured: Boolean(sendgridFromEmail),
        sendgridFromEmail: sendgridFromEmail || null,
        cronSecretConfigured: Boolean(cronSecret),
        cronSecretPreview: maskSecret(cronSecret),
        appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL),
      },
      activeCron: {
        path: "/api/cron/daily",
        schedule: "0 22 * * *",
        localMeaning: "08:00 Australia/Brisbane",
      },
      testActions: ["daily-plan", "weekly-report"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

export async function POST(req: Request) {
  try {
    await assertAdmin(req);
    const body = (await req.json().catch(() => ({}))) as EmailOpsPayload;
    const action = body.action === "weekly-report" ? "weekly-report" : body.action === "daily-plan" ? "daily-plan" : "";
    const testEmail = normalizeEmail(body.testEmail);

    if (!action) {
      return NextResponse.json({ error: "Choose daily-plan or weekly-report." }, { status: 400 });
    }
    if (!testEmail) {
      return NextResponse.json({ error: "Enter a valid test email address." }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
      return NextResponse.json({ error: "SendGrid is not configured. Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in Vercel." }, { status: 500 });
    }

    sgMail.setApiKey(apiKey);
    const url = appUrl();

    if (action === "daily-plan") {
      const dailyPlanUrl = `${url}/daily-plan`;
      const recentSummary = "No accepted Daily Plan is locked yet. Generate your pre-market plan, confirm max trades, risk, allowed setups, and stop conditions before entering the market.";
      await sgMail.send({
        to: testEmail,
        from: { email: fromEmail, name: "ProfitPnL Daily Plan" },
        subject: "Test: Your Daily Trading Plan isn’t locked yet",
        text: `Hi Trader,\n\nWe haven’t found an accepted Daily Plan for today yet. ${recentSummary}\n\nGenerate and lock your Daily Plan before you trade: ${dailyPlanUrl}\n\n— ProfitPnL`,
        html: dailyPlanReminderEmailHtml({
          name: "Trader",
          dailyPlanUrl,
          timezone: "Australia/Brisbane",
          reminderTime: "08:00",
          recentSummary,
        }),
      });
    }

    if (action === "weekly-report") {
      const weeklyReviewUrl = `${url}/weekly-review`;
      await sgMail.send({
        to: testEmail,
        from: { email: fromEmail, name: "ProfitPnL Weekly Report" },
        subject: "Test: Your Weekly ProfitPnL Report is ready (+1.75R)",
        text: `Hi Trader,\n\nYour weekly ProfitPnL report is ready. Closed trades: 8. Total result: +1.75R. Open: ${weeklyReviewUrl}\n\n— ProfitPnL`,
        html: weeklyReviewReminderEmailHtml({
          name: "Trader",
          weeklyReviewUrl,
          timezone: "Australia/Brisbane",
          periodLabel: "Sample week",
          totalTrades: 8,
          totalR: 1.75,
          winRate: 0.625,
          bestSetup: "Opening Range Breakout",
          mainLeak: "FOMO Entry",
          reviewQueue: 2,
        }),
      });
    }

    return NextResponse.json({ ok: true, action, sentTo: testEmail, sentAt: new Date().toISOString() });
  } catch (error) {
    console.error("Email ops error:", error);
    const message = error instanceof Error ? error.message : "Could not send test email.";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
