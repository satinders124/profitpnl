import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tools", "/tools/"],
        disallow: [
          "/api/",
          "/dashboard",
          "/settings",
          "/accounts",
          "/trades",
          "/analytics",
          "/playbook",
          "/psychology",
          "/ai-coach",
          "/upgrade",
          "/coming-soon",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
