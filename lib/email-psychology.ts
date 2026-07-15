/**
 * Curated list of elite trading psychology quotes and reflections.
 */
export const PSYCHOLOGY_QUOTES = [
  {
    quote: "The elements of good trading are: (1) cutting losses, (2) cutting losses, and (3) cutting losses. If you can follow these three rules, you may have a chance.",
    author: "Ed Seykota"
  },
  {
    quote: "The goal of a successful trader is to make the best trades. Money is secondary.",
    author: "Alexander Elder"
  },
  {
    quote: "You have to expect the unexpected in this business; you cannot be content with just having a good system. You have to maintain absolute mental flexibility.",
    author: "Mark Douglas"
  },
  {
    quote: "If you can learn to create a state of mind that is not affected by the market's behavior, the struggle will cease to exist.",
    author: "Mark Douglas (Trading in the Zone)"
  },
  {
    quote: "In trading, you have to be comfortable being uncomfortable. The best setups are often the hardest ones to take.",
    author: "Brett Steenbarger"
  },
  {
    quote: "The market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett"
  },
  {
    quote: "Do not anticipate and move without market confirmation. Being a little late is your insurance policy that you are right.",
    author: "Jesse Livermore"
  },
  {
    quote: "It's not whether you're right or wrong that's important, but how much money you make when you're right and how much you lose when you're wrong.",
    author: "Stanley Druckenmiller"
  },
  {
    quote: "Amateur traders focus on how much money they can make. Professional traders focus on how much money they can lose.",
    author: "Paul Tudor Jones"
  },
  {
    quote: "I survive because I recognize my mistakes early, cut my losses quickly, and wait for the high-probability setups.",
    author: "Richard Dennis"
  }
];

// Helper to escape HTML tags
function escape(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";

/**
 * Renders the daily check-in / reminder email.
 */
export function dailyCheckinEmailHtml(name: string, quote: typeof PSYCHOLOGY_QUOTES[0], hasLoggedTrades: boolean): string {
  const safeName = escape(name) || "there";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

  const messageTitle = hasLoggedTrades 
    ? `Excellent work today, ${safeName}!`
    : `Keep your trading streak alive, ${safeName}!`;

  const messageText = hasLoggedTrades
    ? "Awesome job logging your trades today. Building this consistency turns your trade history into a powerful behavioral database. Keep up the disciplined execution!"
    : "We noticed your journal is quiet today. Remember, logging your winning and losing trades is the only way to build a real historical edge. Don't let today's data disappear.";

  const quoteBox = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f5ef; border-left:4px solid #c8961e; border-radius:6px; margin: 24px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0 0 8px; font-family:${FONT}; font-size:14px; font-style:italic; line-height:1.6; color:#5b5b78;">
            "${escape(quote.quote)}"
          </p>
          <p style="margin: 0; font-family:${FONT}; font-size:12px; font-weight:700; color:#c8961e; text-align:right;">
            — ${escape(quote.author)}
          </p>
        </td>
      </tr>
    </table>
  `;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f8" style="background-color:#f4f4f8; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;">
            <tr>
              <td style="padding-bottom:20px; text-align:center;">
                <span style="font-family:${FONT}; font-size:18px; font-weight:900; color:#080810;">ProfitPnL Check-in</span>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #e7e7f0; border-radius:20px; padding:32px 24px; box-shadow:0 4px 12px rgba(8,8,16,0.03);">
                <h1 style="margin:0 0 12px; font-family:${FONT}; font-size:20px; font-weight:900; color:#080810; letter-spacing:-0.02em;">
                  ${messageTitle}
                </h1>
                
                <p style="margin:0 0 16px; font-family:${FONT}; font-size:13px; line-height:1.7; color:#5b5b78;">
                  ${messageText}
                </p>

                <p style="margin:24px 0 8px; font-family:${FONT}; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#8a8aa3;">
                  🧠 Daily Psychology Reflection
                </p>
                ${quoteBox}

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                  <tr>
                    <td bgcolor="#f0b429" style="border-radius:12px; background-color:#f0b429;">
                      <a href="${siteUrl}/trades" style="display:inline-block; padding:12px 24px; font-family:${FONT}; font-size:13px; font-weight:900; color:#080810; text-decoration:none;">
                        Open Trade Log Desk →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px; text-align:center;">
                <p style="margin:0; font-family:${FONT}; font-size:10px; color:#8a8aa3;">
                  © ${new Date().getFullYear()} ProfitPnL. You can adjust notification settings inside your Profile tab.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

type WeeklySummaryData = {
  tradesCount: number;
  winRate: number;
  totalR: number;
  profitFactor: number;
  bestSetup: string;
  worstSetup: string;
  wins: number;
  losses: number;
};

/**
 * Renders a premium weekly report detailing their performance metrics.
 */
export function weeklyPerformanceReportHtml(name: string, stats: WeeklySummaryData): string {
  const safeName = escape(name) || "there";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

  const winRateFormatted = `${Math.round(stats.winRate)}%`;
  const totalRFormatted = `${stats.totalR >= 0 ? "+" : ""}${stats.totalR.toFixed(1)}R`;
  const profitFactorFormatted = stats.profitFactor ? stats.profitFactor.toFixed(2) : "—";
  const rColor = stats.totalR >= 0 ? "#00a86b" : "#ff4565";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f8" style="background-color:#f4f4f8; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:550px;">
            <tr>
              <td style="padding-bottom:20px; text-align:center;">
                <span style="font-family:${FONT}; font-size:18px; font-weight:900; color:#080810;">ProfitPnL Weekly Analytics</span>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #e7e7f0; border-radius:20px; padding:32px 24px; box-shadow:0 4px 12px rgba(8,8,16,0.03);">
                <h1 style="margin:0 0 4px; font-family:${FONT}; font-size:22px; font-weight:900; color:#080810; letter-spacing:-0.02em;">
                  Your Weekly Performance Report
                </h1>
                <p style="margin:0 0 24px; font-family:${FONT}; font-size:13px; color:#8a8aa3;">
                  Hi ${safeName}, here is your compiled trading analysis for the past 7 days.
                </p>

                <!-- Stat Grid -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                  <tr>
                    <td width="50%" style="padding-right:8px; padding-bottom:12px;">
                      <div style="background-color:#f8f9fa; border:1px solid #e7e7f0; border-radius:12px; padding:16px; text-align:center;">
                        <p style="margin:0; font-family:${FONT}; font-size:10px; font-weight:800; text-transform:uppercase; color:#8a8aa3; letter-spacing:0.05em;">Total trades</p>
                        <p style="margin:6px 0 0; font-family:${FONT}; font-size:22px; font-weight:900; color:#080810;">${stats.tradesCount}</p>
                      </div>
                    </td>
                    <td width="50%" style="padding-left:8px; padding-bottom:12px;">
                      <div style="background-color:#f8f9fa; border:1px solid #e7e7f0; border-radius:12px; padding:16px; text-align:center;">
                        <p style="margin:0; font-family:${FONT}; font-size:10px; font-weight:800; text-transform:uppercase; color:#8a8aa3; letter-spacing:0.05em;">Weekly Result</p>
                        <p style="margin:6px 0 0; font-family:${FONT}; font-size:22px; font-weight:900; color:${rColor};">${totalRFormatted}</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding-right:8px;">
                      <div style="background-color:#f8f9fa; border:1px solid #e7e7f0; border-radius:12px; padding:16px; text-align:center;">
                        <p style="margin:0; font-family:${FONT}; font-size:10px; font-weight:800; text-transform:uppercase; color:#8a8aa3; letter-spacing:0.05em;">Win rate</p>
                        <p style="margin:6px 0 0; font-family:${FONT}; font-size:22px; font-weight:900; color:#080810;">${winRateFormatted}</p>
                      </div>
                    </td>
                    <td width="50%" style="padding-left:8px;">
                      <div style="background-color:#f8f9fa; border:1px solid #e7e7f0; border-radius:12px; padding:16px; text-align:center;">
                        <p style="margin:0; font-family:${FONT}; font-size:10px; font-weight:800; text-transform:uppercase; color:#8a8aa3; letter-spacing:0.05em;">Profit Factor</p>
                        <p style="margin:6px 0 0; font-family:${FONT}; font-size:22px; font-weight:900; color:#080810;">${profitFactorFormatted}</p>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Behavioral Highlights -->
                <div style="border-top:1px solid #e7e7f0; padding-top:20px; margin-top:20px;">
                  <h3 style="margin:0 0 12px; font-family:${FONT}; font-size:14px; font-weight:900; color:#080810;">
                    📈 Edge Insights
                  </h3>
                  
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT}; font-size:13px; line-height:1.6; color:#5b5b78;">
                    <tr>
                      <td style="padding:6px 0; border-bottom:1px solid #f8f9fa;">
                        <strong>Best Performing Setup:</strong>
                      </td>
                      <td style="padding:6px 0; border-bottom:1px solid #f8f9fa; text-align:right; font-weight:700; color:#00a86b;">
                        ${escape(stats.bestSetup || "—")}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;">
                        <strong>Underperforming Setup / Leak:</strong>
                      </td>
                      <td style="padding:6px 0; text-align:right; font-weight:700; color:#ff4565;">
                        ${escape(stats.worstSetup || "—")}
                      </td>
                    </tr>
                  </table>
                </div>

                <p style="margin:24px 0 12px; font-family:${FONT}; font-size:12px; line-height:1.6; color:#5b5b78;">
                  Every single log matters. Open your professional dashboard to see full charts, session allocations, and deep cognitive patterns.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                  <tr>
                    <td bgcolor="#080810" style="border-radius:12px; background-color:#080810;">
                      <a href="${siteUrl}/analytics" style="display:inline-block; padding:12px 24px; font-family:${FONT}; font-size:13px; font-weight:900; color:#ffffff; text-decoration:none;">
                        Analyze Setup Details →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px; text-align:center;">
                <p style="margin:0; font-family:${FONT}; font-size:10px; color:#8a8aa3;">
                  © ${new Date().getFullYear()} ProfitPnL. Built for the 1%.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
