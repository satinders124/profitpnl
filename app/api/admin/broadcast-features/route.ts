import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import {
  WHATS_NEW_EMAIL_SUBJECT,
  featureAnnouncementEmailHtml,
  whatsNewEmailText,
} from "@/lib/email-announcement";
import { requireAdmin } from "@/lib/affiliates";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";

type BroadcastMode = "test" | "broadcast";

type BroadcastPayload = {
  mode?: BroadcastMode;
  testEmail?: unknown;
  confirmBroadcast?: boolean;
};

type ProfileRecipient = {
  display_name: string | null;
  email: string | null;
};

type Recipient = {
  displayName: string;
  email: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : "";
}

function getStatusFromError(message: string) {
  if (message === "Forbidden") return 403;
  if (message.toLowerCase().includes("authorization") || message.toLowerCase().includes("session")) return 401;
  return 500;
}

function dedupeRecipients(rows: ProfileRecipient[]) {
  const seen = new Set<string>();
  const recipients: Recipient[] = [];

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({ displayName: row.display_name || "Trader", email });
  }

  return recipients;
}

async function sendAnnouncementEmail(recipient: Recipient) {
  await sgMail.send({
    to: recipient.email,
    from: { email: process.env.SENDGRID_FROM_EMAIL!, name: "ProfitPnL Performance Desk" },
    subject: WHATS_NEW_EMAIL_SUBJECT,
    text: whatsNewEmailText(recipient.displayName),
    html: featureAnnouncementEmailHtml(recipient.displayName),
  });
}

async function getTestRecipient(testEmail: string): Promise<Recipient> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email")
    .ilike("email", testEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Could not personalize test announcement email:", error.message);
  }

  return {
    displayName: data?.display_name || "Trader",
    email: testEmail,
  };
}

async function getBroadcastRecipients() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, email")
    .not("email", "is", null);

  if (error) throw error;
  return dedupeRecipients((data || []) as ProfileRecipient[]);
}

/**
 * ADMIN ENDPOINT
 * POST /api/admin/broadcast-features
 *
 * Sends the What's New announcement. Admin UI must send a test email first,
 * then explicitly confirm the all-user broadcast.
 */
export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    requireAdmin(user);

    const payload = (await req.json().catch(() => ({}))) as BroadcastPayload;
    const mode: BroadcastMode = payload.mode === "broadcast" ? "broadcast" : "test";
    const testEmail = normalizeEmail(payload.testEmail);

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      return NextResponse.json(
        {
          error:
            "Email sending is not configured. Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in Vercel, then redeploy before testing the broadcast.",
        },
        { status: 500 }
      );
    }

    sgMail.setApiKey(apiKey);

    if (mode === "test") {
      if (!testEmail) {
        return NextResponse.json({ error: "Enter a valid test email address first." }, { status: 400 });
      }

      const recipient = await getTestRecipient(testEmail);
      await sendAnnouncementEmail(recipient);

      return NextResponse.json({
        success: true,
        mode,
        totalRecipientCount: 1,
        emailsSent: 1,
        testEmail: recipient.email,
        errors: [],
      });
    }

    if (payload.confirmBroadcast !== true) {
      return NextResponse.json(
        { error: "Broadcast not confirmed. Send a test email, approve it, then confirm the all-user send." },
        { status: 400 }
      );
    }

    const recipients = await getBroadcastRecipients();
    let emailsSent = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        await sendAnnouncementEmail(recipient);
        emailsSent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${recipient.email}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      mode,
      totalRecipientCount: recipients.length,
      emailsSent,
      errors,
    });
  } catch (err) {
    console.error("Broadcast features error:", err);
    const message = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: getStatusFromError(message) });
  }
}
