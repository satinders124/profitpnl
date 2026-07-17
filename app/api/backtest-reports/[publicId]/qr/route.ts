import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

type Params = { params: Promise<{ publicId: string }> };

function appUrl(req: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

export async function GET(req: Request, { params }: Params) {
  const { publicId } = await params;
  const url = `${appUrl(req)}/backtest-report/${publicId}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 260 });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
