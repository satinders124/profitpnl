import { escapeHtml, renderEmailLayout } from "@/lib/email-templates";

export const WHATS_NEW_EMAIL_SUBJECT = "🚀 What’s New in ProfitPnL: Daily Plan, AI Reports, Backtesting PDFs & More";

const releaseItems = [
  {
    title: "Trading HQ Command Feed",
    text: "Your dashboard now tells you what needs attention today: Daily Plan, review queue, biggest leak, prop firm risk, and weekly review status.",
  },
  {
    title: "Daily Plan + Plan vs Execution",
    text: "Build your pre-market rules, accept the plan, then compare actual trades against the plan after the session.",
  },
  {
    title: "AI Reports Library",
    text: "Generated AI insights can now be saved and reviewed later from the AI Reports page.",
  },
  {
    title: "Trade Review AI Actions",
    text: "AI Trade Review can now suggest emotion, mistake, lesson, next rule, and apply the review to your journal.",
  },
  {
    title: "Backtesting Report Center",
    text: "Create backtesting reports with CSV export, public share links, PDF download, and QR verification.",
  },
  {
    title: "Import Center + Broker Presets",
    text: "Import CSVs with presets for MT4, MT5, TradingView, Tradovate, NinjaTrader, TopstepX, cTrader, and generic spreadsheets.",
  },
  {
    title: "Prop Firm Mode + Templates",
    text: "Track target progress, daily buffer, max drawdown, and consistency risk with prop-firm account templates.",
  },
  {
    title: "Notifications Foundation",
    text: "Daily Plan and Weekly Review reminder settings are now available from Settings → Notifications.",
  },
];

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";
}

export function whatsNewEmailText(name: string): string {
  const traderName = name || "Trader";
  const siteUrl = getSiteUrl();
  const releaseSummary = releaseItems.map((item) => `- ${item.title}: ${item.text}`).join("\n");

  return `Hi ${traderName},

ProfitPnL just received a major upgrade. It now connects planning, journaling, AI review, backtesting reports, prop-firm risk, imports, and reminders into one workflow.

New in this release:
${releaseSummary}

See what is new: ${siteUrl}/whats-new

Open ProfitPnL and start with Trading HQ or your Daily Plan.

— The ProfitPnL Team`;
}

export function whatsNewEmailHtml(name: string): string {
  const safeName = escapeHtml(name || "Trader");
  const siteUrl = getSiteUrl();

  const body = `
    <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:21px;font-weight:900;color:#080810;letter-spacing:-0.02em;">
      ProfitPnL just became a full trading operating system
    </h1>
    <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.7;color:#5b5b78;">
      Hi ${safeName}, we have shipped a major product upgrade. ProfitPnL now connects planning, journaling, AI review, backtesting reports, prop-firm risk, imports, and reminders into one workflow.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f5ef" style="background-color:#f7f5ef;border:1px solid #e7e7f0;border-radius:14px;margin:0 0 20px;">
      <tr>
        <td style="padding:18px;">
          <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8a8aa3;">
            New command workflow
          </p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.7;color:#080810;">
            Plan before the session, execute with discipline, review trades with AI, find leaks, and share verified backtesting results.
          </p>
        </td>
      </tr>
    </table>

    ${releaseItems.map((item) => `
      <div style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #e7e7f0;">
        <h3 style="margin:0 0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:900;color:#080810;">
          ${escapeHtml(item.title)}
        </h3>
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.6;color:#5b5b78;">
          ${escapeHtml(item.text)}
        </p>
      </div>
    `).join("")}

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;margin-bottom:18px;">
      <tr>
        <td bgcolor="#f0b429" style="border-radius:12px;background-color:#f0b429;background-image:linear-gradient(135deg,#f0b429,#c8961e);">
          <a href="${escapeHtml(siteUrl)}/whats-new" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:900;color:#080810;text-decoration:none;">
            See What’s New →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.7;color:#8a8aa3;">
      Open ProfitPnL and start with Trading HQ or your Daily Plan.
    </p>`;

  return renderEmailLayout({
    preheader: "New ProfitPnL features: Daily Plan, AI Reports, Backtesting PDFs, Prop Firm Mode and more.",
    bodyHtml: body,
  });
}

// Backwards-compatible export used by the existing admin broadcast route.
export function featureAnnouncementEmailHtml(name: string): string {
  return whatsNewEmailHtml(name);
}
