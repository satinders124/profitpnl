import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(_req: Request) {
  try {
    const user = await getAuthenticatedUser(_req);
    const supabase = createServerClient();
    const { data } = await supabase
      .from("backtest_profile")
      .select("*")
      .eq("user_id", user.id)
      .single();
    return NextResponse.json({ profile: data || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest profile GET error:", error);
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const account_size = Number(body.accountSize || 0);
    const currency =
      typeof body.currency === "string" && body.currency
        ? body.currency.slice(0, 8)
        : "USD";

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("backtest_profile")
      .upsert({ user_id: user.id, account_size, currency })
      .select("*")
      .single();

    if (error) {
      console.error("Backtest profile POST error:", error);
      return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, profile: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Backtest profile POST error:", error);
    return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  }
}
