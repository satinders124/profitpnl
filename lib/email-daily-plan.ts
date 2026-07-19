import { escapeHtml, renderEmailLayout } from "@/lib/email-templates";

type DailyPlanReminderEmailArgs = {
  name: string;
  dailyPlanUrl: string;
  timezone: string;
  reminderTime: string;
  recentSummary?: string;
};

export function dailyPlanReminderEmailHtml({
  name,
  dailyPlanUrl,
  timezone,
  reminderTime,
  recentSummary,
}: DailyPlanReminderEmailArgs) {
  const safeName = escapeHtml(name || "Trader");
  const safeUrl = escapeHtml(dailyPlanUrl);
  const safeTimezone = escapeHtml(timezone || "your timezone");
  const safeReminderTime = escapeHtml(reminderTime || "08:00");
  const safeSummary = escapeHtml(recentSummary || "Open ProfitPnL before you trade and lock in your risk rules for the session.");

  const body = `
    <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:900;color:#080810;letter-spacing:-0.02em;">
      Your Daily Trading Plan isn’t locked yet
    </h1>
    <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.7;color:#5b5b78;">
      Hi ${safeName}, we haven’t found an accepted Daily Plan for today yet. Before you trade, take 60 seconds to generate it, set max trades, confirm risk, and lock stop conditions.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f5ef" style="background-color:#f7f5ef;border:1px solid #e7e7f0;border-radius:14px;margin:0 0 20px;">
      <tr>
        <td style="padding:18px;">
          <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8a8aa3;">
            Pre-market risk brief
          </p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.7;color:#080810;">
            ${safeSummary}
          </p>
          <p style="margin:12px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.6;color:#8a8aa3;">
            Reminder time: ${safeReminderTime} · ${safeTimezone}
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
      <tr>
        <td bgcolor="#f0b429" style="border-radius:12px;background-color:#f0b429;background-image:linear-gradient(135deg,#f0b429,#c8961e);">
          <a href="${safeUrl}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:900;color:#080810;text-decoration:none;">
            Generate & Lock Daily Plan →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.7;color:#8a8aa3;">
      You can adjust this reminder from Settings → Notifications.
    </p>`;

  return renderEmailLayout({
    preheader: "Your ProfitPnL Daily Plan is not locked yet.",
    bodyHtml: body,
  });
}
