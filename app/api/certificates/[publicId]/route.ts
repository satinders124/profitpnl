import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { isCertificateSignatureValid, normalizePrivacy, type CertificateSnapshot } from "@/lib/certificates";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { publicId } = await context.params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("certificates")
      .select("public_id, user_id, account_name, title, display_name, is_anonymous, status, data_source, period_start, period_end, metrics, privacy, certificate_hash, created_at, revoked_at")
      .eq("public_id", publicId)
      .eq("visibility", "public")
      .maybeSingle();

    if (error) {
      console.error("Public certificate API error:", error);
      return NextResponse.json({ error: "Could not load certificate." }, { status: 500 });
    }

    if (!data || data.status !== "active") {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
    }

    const snapshot = {
      ...data,
      privacy: normalizePrivacy(data.privacy),
    } as CertificateSnapshot;

    return NextResponse.json({ certificate: snapshot, verified: isCertificateSignatureValid(snapshot) });
  } catch (error) {
    console.error("Public certificate API route error:", error);
    return NextResponse.json({ error: "Could not load certificate." }, { status: 500 });
  }
}
