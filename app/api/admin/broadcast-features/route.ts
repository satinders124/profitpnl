import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { featureAnnouncementEmailHtml } from "@/lib/email-announcement";
import { requireAdmin } from "@/lib/affiliates";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";

/**
 * ADMIN ENDPOINT
 * POST /api/admin/broadcast-features
 * 
 * Securely emails the feature announcement newsletter to all registered users.
 * Restricted to administrators only.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    requireAdmin(user); // Enforces administrator validation

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (apiKey) sgMail.setApiKey(apiKey);

    const supabase = createServerClient();

    // Pull all users
    const { data: users, error } = await supabase
      .from("profiles")
      .select("display_name, email");

    if (error) {
      throw error;
    }

    let emailsSent = 0;
    const errors: string[] = [];

    for (const recipient of users || []) {
      const email = recipient.email;
      if (!email) continue;

      try {
        const html = featureAnnouncementEmailHtml(recipient.display_name || "Trader");

        if (apiKey && fromEmail) {
          await sgMail.send({
            to: email,
            from: { email: fromEmail, name: "ProfitPnL Performance Desk" },
            subject: "🚀 What’s New in ProfitPnL: Daily Plan, AI Reports, Backtesting PDFs & More",
            text: `Hi ${recipient.display_name || "Trader"},\n\nProfitPnL just received a major upgrade: Trading HQ Command Feed, Daily Plan, Plan vs Execution, AI Reports, AI Trade Review, Backtesting Reports with PDF/QR, Import Center presets, Prop Firm Mode, Onboarding, and reminders. See what is new: ${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com"}/whats-new\n\n— The ProfitPnL Team`,
            html,
          });
          emailsSent++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${email}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalRecipientCount: users?.length || 0,
      emailsSent,
      errors
    });
  } catch (err) {
    console.error("Broadcast features error:", err);
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
