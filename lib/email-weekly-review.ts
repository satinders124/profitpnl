import { escapeHtml, renderEmailLayout } from "@/lib/email-templates";

type WeeklyReviewReminderEmailArgs = {
  name: string;
  weeklyReviewUrl: string;
  timezone: string;
  periodLabel: string;
  totalTrades: number;
  totalR: number;
  winRate: number;
  bestSetup: string;
  mainLeak: string;
  reviewQueue: number;
};

function formatR(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function weeklyReviewReminderEmailHtml({
  name,
  weeklyReviewUrl,
  timezone,
  periodLabel,
  totalTrades,
  totalR,
  winRate,
  bestSetup,
  mainLeak,
  reviewQueue,
}: WeeklyReviewReminderEmailArgs) {
  const safeName = escapeHtml(name || "Trader");
  const safeUrl = escapeHtml(weeklyReviewUrl);
  const safeTimezone = escapeHtml(timezone || "your timezone");
  const safePeriod = escapeHtml(periodLabel);
  const safeBestSetup = escapeHtml(bestSetup || "Not enough setup data yet");
  const safeMainLeak = escapeHtml(mainLeak || "No major leak detected yet");

  const body = `
    <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:900;color:#080810;letter-spacing:-0.02em;">
      Your Weekly Trading Review is ready
    </h1>
    <p style="margin:0 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.7;color:#5b5b78;">
      Hi ${safeName}, your weekly review window is ready. Use it to lock in what worked, remove what leaked, and set next week’s rules.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f5ef" style="background-color:#f7f5ef;border:1px solid #e7e7f0;border-radius:14px;margin:0 0 20px;">
      <tr>
        <td style="padding:18px;">
          <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#8a8aa3;">
            Weekly snapshot · ${safePeriod}
          </p>
          <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.7;color:#080810;">
            <strong>${totalTrades}</strong> closed trade${totalTrades === 1 ? "" : "s"} · <strong>${formatR(totalR)}</strong> total · <strong>${formatPct(winRate)}</strong> win rate
          </p>
          <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.7;color:#5b5b78;">
            Best setup: <strong style="color:#00a86b;">${safeBestSetup}</strong><br />
            Main leak: <strong style="color:#c8961e;">${safeMainLeak}</strong><br />
            Review queue: <strong>${reviewQueue}</strong> trade${reviewQueue === 1 ? "" : "s"} need completion
          </p>
          <p style="margin:12px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:11px;line-height:1.6;color:#8a8aa3;">
            Timezone: ${safeTimezone}
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
      <tr>
        <td bgcolor="#f0b429" style="border-radius:12px;background-color:#f0b429;background-image:linear-gradient(135deg,#f0b429,#c8961e);">
          <a href="${safeUrl}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:900;color:#080810;text-decoration:none;">
            Open Weekly Review →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.7;color:#8a8aa3;">
      You can adjust this reminder from Settings → Notifications.
    </p>`;

  return renderEmailLayout({
    preheader: "Your ProfitPnL Weekly Review is ready.",
    bodyHtml: body,
  });
}
