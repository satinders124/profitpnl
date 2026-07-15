/**
 * Premium email template announcing the new AI Risk-Guard features to all users.
 */
export function featureAnnouncementEmailHtml(name: string): string {
  const safeName = name || "there";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

  const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f8" style="background-color:#f4f4f8; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:550px;">
            <tr>
              <td style="padding-bottom:20px; text-align:center;">
                <span style="font-family:${FONT}; font-size:18px; font-weight:900; color:#080810;">ProfitPnL Update</span>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #e7e7f0; border-radius:20px; padding:32px 28px; box-shadow:0 4px 12px rgba(8,8,16,0.03);">
                
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
                  <tr>
                    <td bgcolor="#f7f5ef" style="padding:4px 12px; border-radius:30px;">
                      <span style="font-family:${FONT}; font-size:10px; font-weight:900; color:#c8961e; letter-spacing:0.1em; text-transform:uppercase;">🔥 BRAND NEW RELEASE</span>
                    </td>
                  </tr>
                </table>

                <h1 style="margin:0 0 8px; font-family:${FONT}; font-size:22px; font-weight:900; color:#080810; letter-spacing:-0.02em;">
                  The AI Risk-Guard Terminal is Live!
                </h1>
                
                <p style="margin:0 0 20px; font-family:${FONT}; font-size:13px; line-height:1.7; color:#5b5b78;">
                  Hi ${safeName}, we've just rolled out the single biggest, game-changing feature in the history of trading journals: **The AI Risk-Guard & Cognitive Shift Cockpit**.
                </p>

                <!-- Feature 1 -->
                <div style="margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #e7e7f0;">
                  <h3 style="margin:0 0 6px; font-family:${FONT}; font-size:14px; font-weight:900; color:#080810;">
                    ⏱️ Active Trader Clock-In/Clock-Out
                  </h3>
                  <p style="margin:0; font-family:${FONT}; font-size:12px; line-height:1.6; color:#5b5b78;">
                    Lock in your daily profit targets and loss limits before every session. Your dashboard transforms into an active cockpit monitoring live risk parameters in real-time.
                  </p>
                </div>

                <!-- Feature 2 -->
                <div style="margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #e7e7f0;">
                  <h3 style="margin:0 0 6px; font-family:${FONT}; font-size:14px; font-weight:900; color:#080810;">
                    📒 Playbook Rule Checklist
                  </h3>
                  <p style="margin:0; font-family:${FONT}; font-size:12px; line-height:1.6; color:#5b5b78;">
                    Verify your setups! When registering running positions, the app pulls your strategy rules and demands checklist verification before execution. No more impulse trades.
                  </p>
                </div>

                <!-- Feature 3 -->
                <div style="margin-bottom:24px;">
                  <h3 style="margin:0 0 6px; font-family:${FONT}; font-size:14px; font-weight:900; color:#080810;">
                    🧠 Claude-3 AI Behavioral Closeouts
                  </h3>
                  <p style="margin:0; font-family:${FONT}; font-size:12px; line-height:1.6; color:#5b5b78;">
                    When you clock out, our direct Claude-3 neural integration evaluates your discipline and generates a highly comprehensive, personalized behavioral summary paragraph detailing your shift.
                  </p>
                </div>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px; width:100%;">
                  <tr>
                    <td bgcolor="#f0b429" style="border-radius:12px; background-color:#f0b429; text-align:center;">
                      <a href="${siteUrl}/dashboard" style="display:block; padding:14px 24px; font-family:${FONT}; font-size:13px; font-weight:900; color:#080810; text-decoration:none;">
                        Enter AI Risk-Guard Cockpit →
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
