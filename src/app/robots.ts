import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz";
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/api/", "/account/", "/admin/", "/moderation/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}