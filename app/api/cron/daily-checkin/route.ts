import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { PSYCHOLOGY_QUOTES, dailyCheckinEmailHtml } from "@/lib/email-psychology";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";

/**
 * DAILY CHECKIN CRON
 * 
 * Verifies if user has logged trades in the last 24h.
 * Sends either a celebratory motivation message or a gentle journal nudge,
 * combined with high-quality rotating professional psychology quotes.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (apiKey) sgMail.setApiKey(apiKey);

  const supabase = createServerClient();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get all active users
  const { data: users, error: userError } = await supabase
    .from("profiles")
    .select("id, email, display_name");

  if (userError) {
    console.error("Cron daily-checkin fetch profiles error:", userError);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  let nudgesSent = 0;
  let matchesSent = 0;
  const errors: string[] = [];

  // Pick a semi-random quote based on the current calendar day so it rotates daily
  const dayIndex = new Date().getDate();
  const quote = PSYCHOLOGY_QUOTES[dayIndex % PSYCHOLOGY_QUOTES.length];

  for (const user of users || []) {
    const email = user.email;
    if (!email) continue;

    try {
      // Check if user logged any trades in the last 24 hours
      const { data: trades, error: tradeError } = await supabase
        .from("trades")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", oneDayAgo)
        .limit(1);

      if (tradeError) {
        console.error(`Trade check error for ${user.id}:`, tradeError);
        continue;
      }

      const hasLogged = trades && trades.length > 0;
      const html = dailyCheckinEmailHtml(user.display_name || "Trader", quote, hasLogged);

      if (apiKey && fromEmail) {
        await sgMail.send({
          to: email,
          from: { email: fromEmail, name: "ProfitPnL Check-in" },
          subject: hasLogged 
            ? "Excellent discipline today! Your Daily Reflection inside 🧠"
            : "Your trade log is quiet today. Let's reflection... 🧠",
          text: hasLogged
            ? `Hi ${user.display_name || "Trader"},\n\nExcellent work logging your trades today! Quote of the day: "${quote.quote}" — ${quote.author}. Keep up the great discipline!\n\n— The ProfitPnL Team`
            : `Hi ${user.display_name || "Trader"},\n\nYour trade log is quiet today. Logging your results is the only way to build an edge. Quote of the day: "${quote.quote}" — ${quote.author}.\n\n— The ProfitPnL Team`,
          html,
        });
      }

      if (hasLogged) {
        matchesSent++;
      } else {
        nudgesSent++;
      }
    } catch (err) {
      errors.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    totalChecked: users?.length || 0,
    motivationSent: matchesSent,
    nudgesSent,
    errors,
  });
}
