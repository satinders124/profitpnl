import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser(_req);
    const { id } = await params;
    const supabase = createServerClient();

    const { data: session, error } = await supabase
      .from("backtest_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const { data: trades } = await supabase
      .from("backtest_trades")
      .select("*")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .order("trade_date", { ascending: true })
      .order("created_at", { ascending: true });

    return NextResponse.json({ session, trades: trades || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest model GET error:", error);
    return NextResponse.json({ error: "Could not load model." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") patch.name = body.name.slice(0, 120);
    if (typeof body.market === "string") patch.market = body.market;
    if (body.timeframe !== undefined)
      patch.timeframe = body.timeframe ? String(body.timeframe) : null;
    if (body.symbol !== undefined)
      patch.symbol = body.symbol ? String(body.symbol).toUpperCase() : null;
    if (typeof body.notes === "string") patch.notes = body.notes;
    if (Array.isArray(body.rules)) patch.rules = body.rules;
    if (typeof body.status === "string") patch.status = body.status;
    if (body.starting_balance !== undefined)
      patch.starting_balance = Number(body.starting_balance || 0);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    patch.updated_at = new Date().toISOString();

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("backtest_sessions")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      console.error("Backtest model PATCH error:", error);
      return NextResponse.json({ error: "Could not update model." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, session: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest model PATCH error:", error);
    return NextResponse.json({ error: "Could not update model." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getAuthenticatedUser(_req);
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from("backtest_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Backtest model DELETE error:", error);
      return NextResponse.json({ error: "Could not delete model." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest model DELETE error:", error);
    return NextResponse.json({ error: "Could not delete model." }, { status: 500 });
  }
}
