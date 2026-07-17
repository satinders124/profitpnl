import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ publicId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { publicId } = await params;
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("backtest_reports")
      .select("public_id, title, visibility, period_start, period_end, metrics, trades, created_at")
      .eq("public_id", publicId)
      .eq("visibility", "public")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ report: data });
  } catch (error) {
    console.error("Backtest public report GET error:", error);
    return NextResponse.json({ error: "Could not load report." }, { status: 500 });
  }
}
