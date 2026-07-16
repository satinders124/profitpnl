/**
 * Premium email template welcoming a user to Bias Desk Pro and informing them 
 * of the 2-hour invite-only activation window.
 */
export function buyerIndicatorConfirmationEmailHtml(name: string, tvUsername: string): string {
  const safeName = name || "there";
  const safeTv = tvUsername || "your provided username";
  const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f8" style="background-color:#f4f4f8; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:550px;">
            <tr>
              <td style="padding-bottom:20px; text-align:center;">
                <span style="font-family:${FONT}; font-size:18px; font-weight:900; color:#080810;">ProfitPnL Delivery</span>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="background-color:#ffffff; border:1px solid #e7e7f0; border-radius:20px; padding:32px 28px; box-shadow:0 4px 12px rgba(8,8,16,0.03);">
                
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
                  <tr>
                    <td bgcolor="#f7f5ef" style="padding:4px 12px; border-radius:30px;">
                      <span style="font-family:${FONT}; font-size:10px; font-weight:900; color:#c8961e; letter-spacing:0.1em; text-transform:uppercase;">👑 ACCESS ALLOCATION IN PROGRESS</span>
                    </td>
                  </tr>
                </table>

                <h1 style="margin:0 0 8px; font-family:${FONT}; font-size:22px; font-weight:900; color:#080810; letter-spacing:-0.02em;">
                  Welcome to Bias Desk Pro!
                </h1>
                
                <p style="margin:0 0 16px; font-family:${FONT}; font-size:13px; line-height:1.7; color:#5b5b78;">
                  Hi ${safeName}, thank you for purchasing lifetime access to **Bias Desk Pro — The Mechanical Trend Bias Engine**.
                </p>

                <p style="margin:0 0 20px; font-family:${FONT}; font-size:13px; line-height:1.7; color:#5b5b78;">
                  Our team has received your order and is currently granting your secure, private invite-only script access to your TradingView profile: <strong style="color:#c8961e;">"${safeTv}"</strong>.
                </p>

                <!-- Status Timeline Box -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa; border:1px solid #e7e7f0; border-radius:12px; margin-bottom:24px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 6px; font-family:${FONT}; font-size:12px; font-weight:700; color:#080810;">🚀 Activation Timeline:</p>
                      <p style="margin:0; font-family:${FONT}; font-size:13px; line-height:1.6; color:#5b5b78; font-weight:bold;">
                        Your TradingView chart invite will be fully active within the next <span style="color:#00a86b;">2 Hours</span>!
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Next steps instruction -->
                <h4 style="margin:0 0 8px; font-family:${FONT}; font-size:13px; font-weight:900; color:#080810;">
                  How to load Bias Desk Pro once activated:
                </h4>
                <ol style="margin:0 0 24px; padding-left:20px; font-family:${FONT}; font-size:12px; line-height:1.7; color:#5b5b78;">
                  <li style="margin-bottom:6px;">Open any chart on <strong>TradingView</strong>.</li>
                  <li style="margin-bottom:6px;">Click the <strong>Indicators</strong> button at the top menu bar.</li>
                  <li style="margin-bottom:6px;">Select the <strong>Invite-only scripts</strong> tab on the left.</li>
                  <li>Click <strong>BIAS DESK PRO — Structure Bias</strong> to add it to your chart!</li>
                </ol>

                <p style="margin:0; font-family:${FONT}; font-size:12px; line-height:1.6; color:#8a8aa3;">
                  If you entered an incorrect TradingView username during checkout, please reply directly to this email with your corrected username, and our support team will update it for you immediately.
                </p>

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
