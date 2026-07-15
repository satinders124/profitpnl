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
            subject: "🚨 BRAND NEW: AI Risk-Guard & Cognitive Shifts are Live!",
            text: `Hi ${recipient.display_name || "Trader"},\n\nWe have just released the AI Risk-Guard & Cognitive Shift Cockpit. Head over to your dashboard to clock-in your next trading session!\n\n— The ProfitPnL Team`,
            html,
          });
          emailsSent++;
        }
      } catch (err: any) {
        errors.push(`${email}: ${err?.message || String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalRecipientCount: users?.length || 0,
      emailsSent,
      errors
    });
  } catch (err: any) {
    console.error("Broadcast features error:", err);
    return NextResponse.json({ error: err?.message || "Forbidden" }, { status: 403 });
  }
}
