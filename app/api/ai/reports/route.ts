import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type SaveReportBody = {
  reportType?: string;
  sourcePage?: string;
  context?: unknown;
  title?: string;
  summary?: string;
  bullets?: string[];
  action?: string;
  metadata?: Record<string, unknown>;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean).slice(0, 8) : [];
}

function hashContext(value: unknown) {
  const json = JSON.stringify(value || {});
  return crypto.createHash("sha256").update(json).digest("hex");
}

function isMissingAiReportsTable(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || error?.code === "PGRST205" || (message.includes("ai_reports") && (message.includes("does not exist") || message.includes("schema cache")));
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const reportType = url.searchParams.get("type");
    const supabase = createServerClient();

    let query = supabase
      .from("ai_reports")
      .select("id, report_type, source_page, title, summary, bullets, action, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (reportType) query = query.eq("report_type", reportType);

    const { data, error } = await query;
    if (error) {
      if (isMissingAiReportsTable(error)) return NextResponse.json({ reports: [], warning: "missing_table" });
      throw error;
    }

    return NextResponse.json({ reports: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("AI reports GET error:", error);
    return NextResponse.json({ error: "Could not load AI reports." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = asObject(await req.json().catch(() => ({}))) as SaveReportBody;
    const title = cleanText(body.title, "AI Report").slice(0, 180);
    const summary = cleanText(body.summary);
    const reportType = cleanText(body.reportType, "general").slice(0, 80);
    const sourcePage = cleanText(body.sourcePage, reportType).slice(0, 120);

    if (!summary) return NextResponse.json({ error: "summary required" }, { status: 400 });

    const supabase = createServerClient();
    const contextHash = hashContext(body.context);
    const { data, error } = await supabase
      .from("ai_reports")
      .insert({
        user_id: user.id,
        report_type: reportType,
        source_page: sourcePage,
        context_hash: contextHash,
        title,
        summary,
        bullets: list(body.bullets),
        action: cleanText(body.action) || null,
        metadata: body.metadata || {},
      })
      .select("id, report_type, source_page, title, summary, bullets, action, metadata, created_at")
      .single();

    if (error) {
      if (isMissingAiReportsTable(error)) return NextResponse.json({ ok: false, warning: "missing_table" });
      throw error;
    }

    return NextResponse.json({ ok: true, report: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authorization") || message.includes("session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("AI reports POST error:", error);
    return NextResponse.json({ error: "Could not save AI report." }, { status: 500 });
  }
}
