import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("certificates")
      .select("public_id, title, account_name, display_name, is_anonymous, status, data_source, period_start, period_end, metrics, privacy, created_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Certificate list error:", error);
      return NextResponse.json(
        { error: "Could not load certificates. If this is the first deploy, run the certificates Supabase migration." },
        { status: 500 }
      );
    }

    return NextResponse.json({ certificates: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Certificate list route error:", error);
    return NextResponse.json({ error: "Could not load certificates." }, { status: 500 });
  }
}
