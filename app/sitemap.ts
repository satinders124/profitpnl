import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://profitpnl.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/tools", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/profit-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/lot-size-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/pip-value-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tools/risk-reward-calculator", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/login", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/register", priority: 0.5, changeFrequency: "monthly" as const },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
