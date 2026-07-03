/**
 * Shared branded email layout for ProfitPnL transactional emails.
 *
 * IMPORTANT — why this is a LIGHT layout, not the site's dark theme:
 * The website itself uses a dark navy background (#080810) with gold
 * accents (see app/globals.css). We tried carrying that same dark theme
 * into email (dark card + color-scheme meta tags + dark-mode media
 * queries), but Gmail's mobile app runs its own proprietary color
 * inversion on dark-background emails that ignores those standard
 * techniques, and reliably mis-renders dark navy as pink/magenta.
 * This is a known, long-standing Gmail app limitation — not something
 * fixable purely with CSS on the sending side.
 *
 * The industry-standard workaround (used by Stripe, GitHub, Linear, etc.
 * for transactional email) is to avoid a dark background entirely: a
 * light card with the same gold brand accents. This keeps the emails
 * unmistakably "ProfitPnL" (gold gradient logo, gold OTP code, gold CTA)
 * while being immune to Gmail's dark-mode bug, since there's no dark
 * background for it to reprocess.
 */

const COLORS = {
  // Light card system (email-safe — see note above)
  pageBg: "#f4f4f8",
  card: "#ffffff",
  cardSoft: "#f7f5ef", // warm off-white for the OTP code box
  border: "#e7e7f0",
  gold: "#c8961e", // slightly deepened for AA contrast on a white card
  goldBright: "#f0b429",
  navy: "#080810", // primary heading/text — same ink as the site's background
  muted: "#5b5b78",
  dim: "#8a8aa3",
  green: "#00a86b", // deepened for contrast on white
};

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The gold gradient "P" mark, same brand mark used across the app
 * (Navbar, footer, forms) — rebuilt as email-safe HTML/CSS.
 */
function logoMarkHtml() {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td bgcolor="${COLORS.goldBright}" style="width:36px;height:36px;border-radius:10px;background-color:${COLORS.goldBright};background-image:linear-gradient(135deg,${COLORS.goldBright},${COLORS.gold});text-align:center;vertical-align:middle;">
          <span style="font-family:${FONT_STACK};font-size:18px;font-weight:900;color:${COLORS.navy};line-height:36px;">P</span>
        </td>
        <td style="padding-left:10px;vertical-align:middle;">
          <span style="font-family:${FONT_STACK};font-size:17px;font-weight:900;color:${COLORS.navy};letter-spacing:-0.02em;">ProfitPnL</span>
        </td>
      </tr>
    </table>`;
}

type EmailLayoutOptions = {
  preheader: string; // hidden preview text shown in inbox lists
  bodyHtml: string;
};

/**
 * Wraps any transactional email body in the shared ProfitPnL shell:
 * light card, gold-accented logo header, consistent footer.
 */
export function renderEmailLayout({ preheader, bodyHtml }: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>ProfitPnL</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.pageBg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.pageBg}" style="background-color:${COLORS.pageBg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;">
            <tr>
              <td style="padding-bottom:22px;">
                ${logoMarkHtml()}
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:20px;padding:32px 28px;box-shadow:0 2px 10px rgba(8,8,16,0.05);">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;text-align:center;">
                <p style="margin:0;font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.04em;color:${COLORS.dim};">
                  © ${new Date().getFullYear()} ProfitPnL. Built for the 1% of Traders.
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

/**
 * OTP verification code email — sent when a user starts signup.
 */
export function otpEmailHtml(name: string, code: string): string {
  const safeName = escapeHtml(name) || "there";

  const body = `
    <h1 style="margin:0 0 8px;font-family:${FONT_STACK};font-size:20px;font-weight:900;color:${COLORS.navy};letter-spacing:-0.02em;">
      Verify your email
    </h1>
    <p style="margin:0 0 22px;font-family:${FONT_STACK};font-size:13px;line-height:1.7;color:${COLORS.muted};">
      Hi ${safeName}, use the code below to finish creating your ProfitPnL account.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.cardSoft}" style="background-color:${COLORS.cardSoft};border:1px solid ${COLORS.border};border-radius:14px;margin-bottom:22px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <span style="font-family:'Courier New',ui-monospace,monospace;font-size:34px;font-weight:900;letter-spacing:10px;color:${COLORS.gold};">
            ${escapeHtml(code)}
          </span>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:1.7;color:${COLORS.dim};">
      This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — no account will be created.
    </p>`;

  return renderEmailLayout({
    preheader: `${code} is your ProfitPnL verification code`,
    bodyHtml: body,
  });
}

/**
 * Welcome / "email verified" confirmation — sent right after a user
 * successfully completes OTP verification and their account is created.
 */
export function welcomeEmailHtml(name: string): string {
  const safeName = escapeHtml(name) || "there";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
      <tr>
        <td bgcolor="${COLORS.cardSoft}" style="width:40px;height:40px;border-radius:12px;background-color:${COLORS.cardSoft};text-align:center;vertical-align:middle;">
          <span style="font-family:${FONT_STACK};font-size:18px;color:${COLORS.green};line-height:40px;">&#10003;</span>
        </td>
      </tr>
    </table>

    <h1 style="margin:0 0 8px;font-family:${FONT_STACK};font-size:20px;font-weight:900;color:${COLORS.navy};letter-spacing:-0.02em;">
      You're verified, ${safeName}.
    </h1>
    <p style="margin:0 0 22px;font-family:${FONT_STACK};font-size:13px;line-height:1.7;color:${COLORS.muted};">
      Your email has been successfully verified and your ProfitPnL account is ready. Start logging trades, decoding your patterns, and letting your AI Coach tell you exactly what's holding you back.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
      <tr>
        <td bgcolor="${COLORS.goldBright}" style="border-radius:12px;background-color:${COLORS.goldBright};background-image:linear-gradient(135deg,${COLORS.goldBright},${COLORS.gold});">
          <a href="${siteUrl}/dashboard" style="display:inline-block;padding:13px 26px;font-family:${FONT_STACK};font-size:13px;font-weight:900;color:${COLORS.navy};text-decoration:none;">
            Go to Dashboard →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:1.7;color:${COLORS.dim};">
      Didn't create this account? Contact us and we'll help sort it out.
    </p>`;

  return renderEmailLayout({
    preheader: "Your ProfitPnL email is verified — your account is ready.",
    bodyHtml: body,
  });
}
