import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";
import { dailyPlanReminderEmailHtml } from "@/lib/email-daily-plan";
import { weeklyReviewReminderEmailHtml } from "@/lib/email-weekly-review";
import { logEmailEvent } from "@/lib/email-events";

export const runtime = "nodejs";

type TestEmailBody = {
  type?: unknown;
};

type TestType = "daily-plan" | "weekly-report";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";
}

function eventType(type: TestType) {
  return type === "weekly-report" ? "user_test_weekly_report" : "user_test_daily_plan";
}

function statusFromError(message: string) {
  if (message.toLowerCase().includes("authorization") || message.toLowerCase().includes("session")) return 401;
  return 500;
}

export async function POST(req: Request) {
  const supabase = createServerClient();
  let userId: string | null = null;
  let recipientEmail: string | null = null;
  let selectedType: TestType = "daily-plan";

  try {
    const user = await getAuthenticatedUser(req);
    userId = user.id;
    recipientEmail = user.email || null;

    const body = (await req.json().catch(() => ({}))) as TestEmailBody;
    selectedType = body.type === "weekly-report" ? "weekly-report" : "daily-plan";

    if (!recipientEmail) {
      await logEmailEvent(supabase, {
        userId,
        recipientEmail,
        eventType: eventType(selectedType),
        status: "failed",
        reason: "missing_email",
        source: "settings_notifications",
        metadata: { selectedType },
      });
      return NextResponse.json({ error: "Your account does not have an email address." }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
      await logEmailEvent(supabase, {
        userId,
        recipientEmail,
        eventType: eventType(selectedType),
        status: "failed",
        reason: "email_not_configured",
        providerMessage: "Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL",
        source: "settings_notifications",
        metadata: { selectedType, sendgridApiKeyConfigured: Boolean(apiKey), sendgridFromEmailConfigured: Boolean(fromEmail) },
      });
      return NextResponse.json({ error: "Email sending is not configured yet. Please contact support." }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, timezone")
      .eq("id", user.id)
      .maybeSingle();

    const name = profile?.display_name || user.email?.split("@")[0] || "Trader";
    const timezone = profile?.timezone || "Australia/Brisbane";
    const url = appUrl();
    sgMail.setApiKey(apiKey);

    if (selectedType === "daily-plan") {
      const dailyPlanUrl = `${url}/daily-plan`;
      const recentSummary = "This is a test of your Daily Plan reminder. In production, ProfitPnL only sends this when today’s Daily Plan is not locked yet and includes recent risk context from your journal.";
      await sgMail.send({
        to: recipientEmail,
        from: { email: fromEmail, name: "ProfitPnL Daily Plan" },
        subject: "Test: Your Daily Trading Plan isn’t locked yet",
        text: `Hi ${name},\n\n${recentSummary}\n\nGenerate and lock your Daily Plan before you trade: ${dailyPlanUrl}\n\n— ProfitPnL`,
        html: dailyPlanReminderEmailHtml({
          name,
          dailyPlanUrl,
          timezone,
          reminderTime: "08:00",
          recentSummary,
        }),
      });
    }

    if (selectedType === "weekly-report") {
      const weeklyReviewUrl = `${url}/weekly-review`;
      await sgMail.send({
        to: recipientEmail,
        from: { email: fromEmail, name: "ProfitPnL Weekly Report" },
        subject: "Test: Your Weekly ProfitPnL Report is ready (+1.75R)",
        text: `Hi ${name},\n\nThis is a test of your Weekly ProfitPnL Report. Closed trades: 8. Total result: +1.75R. Open: ${weeklyReviewUrl}\n\n— ProfitPnL`,
        html: weeklyReviewReminderEmailHtml({
          name,
          weeklyReviewUrl,
          timezone,
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

    await logEmailEvent(supabase, {
      userId,
      recipientEmail,
      eventType: eventType(selectedType),
      status: "sent",
      source: "settings_notifications",
      metadata: { selectedType, testSend: true },
    });

    return NextResponse.json({ ok: true, type: selectedType, sentTo: recipientEmail, sentAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send test email.";
    await logEmailEvent(supabase, {
      userId,
      recipientEmail,
      eventType: eventType(selectedType),
      status: "failed",
      reason: "send_failed",
      providerMessage: message,
      source: "settings_notifications",
      metadata: { selectedType },
    }).catch(() => null);
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
