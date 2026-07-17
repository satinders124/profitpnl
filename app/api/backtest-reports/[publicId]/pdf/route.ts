import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ publicId: string }> };

type Report = {
  public_id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  metrics: Record<string, unknown>;
  created_at: string;
};

type QrModules = {
  size: number;
  data: boolean[];
};

type QrModel = {
  modules: QrModules;
};

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(value: unknown) {
  return `${(n(value) * 100).toFixed(1)}%`;
}

function r(value: unknown) {
  const parsed = n(value);
  return `${parsed >= 0 ? "+" : ""}${parsed.toFixed(2)}R`;
}

function money(value: unknown) {
  const parsed = n(value);
  return `${parsed >= 0 ? "+" : "-"}$${Math.abs(parsed).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pdfEscape(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

function textLine(text: string, x: number, y: number, size = 11) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET\n`;
}

function rect(x: number, y: number, w: number, h: number) {
  return `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
}

async function qrRects(url: string, x: number, y: number, size: number) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" }) as unknown as QrModel;
  const modules = qr.modules;
  const cell = size / modules.size;
  let out = "0 0 0 rg\n";
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.data[row * modules.size + col]) {
        out += rect(x + col * cell, y + (modules.size - row - 1) * cell, cell, cell);
      }
    }
  }
  return out;
}

async function buildPdf(report: Report, publicUrl: string) {
  const m = report.metrics || {};
  let content = "";
  content += "0.95 0.95 0.98 rg\n0 0 612 792 re f\n";
  content += "0.05 0.05 0.08 rg\n0 700 612 92 re f\n";
  content += "1 1 1 rg\n";
  content += textLine("ProfitPnL Backtesting Report", 50, 750, 22);
  content += textLine(report.title, 50, 724, 14);
  content += "0 0 0 rg\n";
  content += textLine(`Share ID: ${report.public_id}`, 50, 680, 10);
  content += textLine(`Period: ${report.period_start || "—"} to ${report.period_end || "—"}`, 50, 664, 10);
  content += textLine(`Generated: ${new Date(report.created_at).toLocaleDateString("en-US")}`, 50, 648, 10);

  const rows = [
    ["Trades", String(m.tradeCount || 0)],
    ["Win Rate", pct(m.winRate)],
    ["Total R", r(m.totalR)],
    ["Expectancy", r(m.expectancy)],
    ["Profit Factor", n(m.profitFactor) >= 99 ? "∞" : n(m.profitFactor).toFixed(2)],
    ["Max Drawdown", r(m.maxDrawdownR)],
    ["Gross P&L", money(m.grossPnl)],
    ["Rule Adherence", pct(m.averageRuleAdherence)],
    ["Best Model", String(m.bestModel || "—")],
    ["Weakest Model", String(m.weakestModel || "—")],
  ];

  let y = 604;
  content += textLine("Performance Metrics", 50, y, 16);
  y -= 30;
  for (const [label, value] of rows) {
    content += "1 1 1 rg\n" + rect(45, y - 6, 330, 22) + "0 0 0 rg\n";
    content += textLine(label, 55, y, 10);
    content += textLine(value, 220, y, 10);
    y -= 28;
  }

  content += textLine("Scan to verify public results", 415, 604, 12);
  content += await qrRects(publicUrl, 410, 410, 145);
  content += "0 0 0 rg\n";
  content += textLine(publicUrl, 410, 390, 7);
  content += textLine("Risk disclaimer: Backtested results are hypothetical and do not guarantee future performance.", 50, 60, 8);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { publicId } = await params;
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("backtest_reports")
      .select("public_id, title, period_start, period_end, metrics, created_at")
      .eq("public_id", publicId)
      .eq("visibility", "public")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Report not found." }, { status: 404 });

    const publicUrl = `${appUrl(req)}/backtest-report/${publicId}`;
    const pdf = await buildPdf(data as Report, publicUrl);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="profitpnl-backtest-${publicId}.pdf"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Backtest PDF error:", error);
    return NextResponse.json({ error: "Could not generate PDF." }, { status: 500 });
  }
}
