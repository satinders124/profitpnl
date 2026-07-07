import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

// Returns every trade across all of the user's journal backtest sessions
// in a single round-trip (replaces the previous 1-per-model N+1 fetch).
export async function GET(_req: Request) {
  try {
    const user = await getAuthenticatedUser(_req);
    const supabase = createServerClient();

    const { data: sessions } = await supabase
      .from("backtest_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", "journal");

    const ids = (sessions || []).map((s) => s.id);
    if (ids.length === 0) {
      return NextResponse.json({ trades: [] });
    }

    const { data: trades, error } = await supabase
      .from("backtest_trades")
      .select("*")
      .in("session_id", ids)
      .order("trade_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Backtest all trades GET error:", error);
      return NextResponse.json({ error: "Could not load trades." }, { status: 500 });
    }

    return NextResponse.json({ trades: trades || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest all trades GET error:", error);
    return NextResponse.json({ error: "Could not load trades." }, { status: 500 });
  }
}
