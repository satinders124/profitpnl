import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const { publicId } = (await req.json().catch(() => ({}))) as { publicId?: string };

    if (!publicId) {
      return NextResponse.json({ error: "Certificate ID is required." }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from("certificates")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("public_id", publicId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Certificate revoke error:", error);
      return NextResponse.json({ error: "Could not revoke certificate." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization header") || message.includes("session")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Certificate revoke route error:", error);
    return NextResponse.json({ error: "Could not revoke certificate." }, { status: 500 });
  }
}
