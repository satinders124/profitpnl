import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ppnl_bypass";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Paths that should always be reachable, even in Coming Soon mode.
const ALLOWED_PATHS = [
  "/coming-soon",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/risk-disclaimer",
  "/cookie-policy",
  "/refund-policy",
  "/journaling-guides",
  "/csv-templates",
  "/prop-firm-rules",
  "/playbooks",
  "/trading-metrics",
  "/google-sheets-trading-journal-template",
  "/reports/trader-benchmark-report",
];
const ALLOWED_PREFIXES = ["/tools", "/cert", "/prop-firm-rules", "/playbooks", "/trading-metrics", "/reports", "/embed"];

export function proxy(req: NextRequest) {
  const comingSoonEnabled = process.env.COMING_SOON_MODE === "true";

  if (!comingSoonEnabled) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = req.nextUrl;

  // Never gate static assets, Next internals, API routes, or the page itself.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    /\.(?:png|jpg|jpeg|svg|ico|webp|gif|css|js|txt|xml|json|woff2?)$/.test(
      pathname
    ) ||
    ALLOWED_PATHS.includes(pathname) ||
    ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return NextResponse.next();
  }

  const bypassSecret = process.env.COMING_SOON_BYPASS_SECRET;
  const providedKey = searchParams.get("bypass");
  const hasValidCookie = req.cookies.get(COOKIE_NAME)?.value === bypassSecret;

  // Visiting with ?bypass=SECRET grants access and remembers it via cookie.
  if (bypassSecret && providedKey === bypassSecret) {
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("bypass");

    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(COOKIE_NAME, bypassSecret, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res;
  }

  if (hasValidCookie) {
    return NextResponse.next();
  }

  const comingSoonUrl = req.nextUrl.clone();
  comingSoonUrl.pathname = "/coming-soon";
  comingSoonUrl.search = "";

  return NextResponse.rewrite(comingSoonUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next internals)
     * - favicon.ico
     * These are also filtered above, this just reduces middleware invocations.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
