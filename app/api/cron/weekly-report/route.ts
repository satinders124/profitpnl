import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { weeklyPerformanceReportHtml } from "@/lib/email-psychology";
import { calcStats } from "@/lib/stats";
import { Trade } from "@/types/trade";
import sgMail from "@sendgrid/mail";

export const runtime = "nodejs";

/**
 * WEEKLY PERFORMANCE REPORT CRON
 * 
 * Runs every Sunday to compile historical analytics from the past 7 days:
 * - Computes win rate, trades count, and R-multiple generated.
 * - Extracts best-performing and worst-performing setups.
 * - Sends a premium-designed weekly analytics email report.
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get active users
  const { data: users, error: userError } = await supabase
    .from("profiles")
    .select("id, email, display_name");

  if (userError) {
    console.error("Cron weekly-report fetch profiles error:", userError);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  let reportsSent = 0;
  const errors: string[] = [];

  for (const user of users || []) {
    const email = user.email;
    if (!email) continue;

    try {
      // Get all closed trades logged by this user in the past 7 days
      const { data: rawTrades, error: tradeError } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo);

      if (tradeError) {
        console.error(`Weekly trade fetch error for user ${user.id}:`, tradeError);
        continue;
      }

      const trades = (rawTrades || []) as unknown as Trade[];

      // Filter to closed/result-bearing trades for statistical calculations
      const closedTrades = trades.filter(t => t.result !== "" && t.result !== null && t.result !== undefined);

      if (closedTrades.length === 0) {
        // Skip users with no trading activity this week to reduce email fatigue
        continue;
      }

      // Compute statistics for the 7-day period
      const stats = calcStats(closedTrades);

      // Compute setup breakdowns to find best & worst setups
      const setupMap: Record<string, { totalR: number; count: number }> = {};
      closedTrades.forEach(t => {
        if (!t.setup) return;
        if (!setupMap[t.setup]) setupMap[t.setup] = { totalR: 0, count: 0 };
        setupMap[t.setup].totalR += Number(t.result || 0);
        setupMap[t.setup].count += 1;
      });

      let bestSetup = "—";
      let worstSetup = "—";
      let bestR = -Infinity;
      let worstR = Infinity;

      Object.entries(setupMap).forEach(([name, data]) => {
        if (data.totalR > bestR) {
          bestR = data.totalR;
          bestSetup = `${name} (${data.totalR >= 0 ? "+" : ""}${data.totalR.toFixed(1)}R)`;
        }
        if (data.totalR < worstR) {
          worstR = data.totalR;
          worstSetup = `${name} (${data.totalR.toFixed(1)}R)`;
        }
      });

      const reportData = {
        tradesCount: closedTrades.length,
        winRate: stats.winRate,
        totalR: stats.totalR,
        profitFactor: stats.profitFactor,
        bestSetup: bestR !== -Infinity ? bestSetup : "No setups tagged",
        worstSetup: worstR !== Infinity ? worstSetup : "No setups tagged",
        wins: stats.wins,
        losses: stats.losses,
      };

      const html = weeklyPerformanceReportHtml(user.display_name || "Trader", reportData);

      if (apiKey && fromEmail) {
        await sgMail.send({
          to: email,
          from: { email: fromEmail, name: "ProfitPnL Performance Desk" },
          subject: `Your Weekly Performance Report is ready (${stats.totalR >= 0 ? "+" : ""}${stats.totalR.toFixed(1)}R)`,
          text: `Hi ${user.display_name || "Trader"},\n\nYour weekly trading performance summary is ready: taken ${closedTrades.length} trades, generated ${stats.totalR.toFixed(1)}R, Win Rate of ${Math.round(stats.winRate)}%.\n\n— The ProfitPnL Team`,
          html,
        });
      }

      reportsSent++;
    } catch (err) {
      errors.push(`${user.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    totalChecked: users?.length || 0,
    reportsSent,
    errors,
  });
}
