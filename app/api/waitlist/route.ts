/* ═══════════════════════════════════════════════════════════════
   ProfitPnL — Waitlist API route (SendGrid)

   📍 COPY THIS FILE TO:  app/api/waitlist/route.ts   (Next.js App Router)

   🔑 ENV SETUP — add to .env.local (and your host's env vars):
      SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx

   ⚠️  Make sure hello@profitpnl.com is a VERIFIED SENDER in SendGrid
      (Settings → Sender Authentication → verify the profitpnl.com
      domain, or at minimum single-sender-verify hello@profitpnl.com),
      otherwise SendGrid returns 403 Forbidden.

   No npm package needed — calls SendGrid's v3 REST API directly.
   ═══════════════════════════════════════════════════════════════ */

import { NextResponse } from "next/server";

const FROM_EMAIL = "hello@profitpnl.com";
const FROM_NAME = "ProfitPnL";

function welcomeHtml(email: string): string {
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#080810;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#080810;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#161628;border:1px solid #1e1e38;border-radius:16px;overflow:hidden;">

            <!-- gold top bar -->
            <tr><td style="height:4px;background:linear-gradient(90deg,#c8961e,#f0b429,#c8961e);font-size:0;line-height:0;">&nbsp;</td></tr>

            <!-- header / logo -->
            <tr>
              <td style="padding:36px 40px 0 40px;" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:linear-gradient(135deg,#f0b429,#c8961e);border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;font-size:22px;line-height:44px;">📈</td>
                    <td style="padding-left:12px;font-size:24px;font-weight:800;color:#f0f0ff;">Profit<span style="color:#f0b429;">PnL</span></td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- body -->
            <tr>
              <td style="padding:32px 40px 8px 40px;" align="center">
                <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.3;color:#f0f0ff;">You're on the list! 🎉</h1>
                <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#a0a0c0;">
                  Thanks for joining the <strong style="color:#f0f0ff;">ProfitPnL</strong> waitlist.
                  You've locked in your spot as an early bird — which means
                  <strong style="color:#f0b429;">3 months free</strong> when we launch.
                </p>
                <p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:#a0a0c0;">
                  We're building the AI-powered trading journal that tracks every trade,
                  decodes every pattern, and tells you exactly what's holding you back.
                  You'll be the first to know the moment we go live.
                </p>

                <!-- stat strip -->
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px auto;">
                  <tr>
                    <td style="background-color:#0d0d1a;border:1px solid #1e1e38;border-radius:10px;padding:10px 18px;font-family:'Courier New',monospace;font-size:12px;color:#00d084;font-weight:bold;">LONG discipline</td>
                    <td style="width:10px;">&nbsp;</td>
                    <td style="background-color:#0d0d1a;border:1px solid #1e1e38;border-radius:10px;padding:10px 18px;font-family:'Courier New',monospace;font-size:12px;color:#ff4565;font-weight:bold;">SHORT excuses</td>
                  </tr>
                </table>

                <!-- CTA -->
                <a href="https://profitpnl.com" style="display:inline-block;background:linear-gradient(180deg,#f0b429,#c8961e);color:#080810;font-size:14px;font-weight:bold;text-decoration:none;padding:14px 36px;border-radius:12px;">Visit profitpnl.com →</a>
              </td>
            </tr>

            <!-- footer -->
            <tr>
              <td style="padding:32px 40px 32px 40px;" align="center">
                <p style="margin:0;border-top:1px solid #1e1e38;padding-top:24px;font-size:12px;line-height:1.6;color:#5a5a80;">
                  You received this email because ${email} joined the waitlist at profitpnl.com.<br/>
                  © 2026 ProfitPnL · Built for prop traders
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error("SENDGRID_API_KEY is not set");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        reply_to: { email: FROM_EMAIL, name: FROM_NAME },
        subject: "You're on the ProfitPnL waitlist 🎉",
        content: [
          {
            type: "text/plain",
            value:
              "Thanks for joining the ProfitPnL waitlist!\n\n" +
              "You've locked in your early-bird spot — 3 months free at launch.\n" +
              "We'll email you the moment we go live.\n\n" +
              "— The ProfitPnL Team\nhttps://profitpnl.com",
          },
          { type: "text/html", value: welcomeHtml(email) },
        ],
      }),
    });

    // SendGrid returns 202 Accepted on success with an empty body
    if (res.status !== 202) {
      const detail = await res.text();
      console.error("SendGrid error", res.status, detail);
      return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist route error", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
