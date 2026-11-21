import type { MetadataRoute } from "next";

// AI crawlers that respect robots.txt. Badly behaved scrapers ignore this;
// rate limits and the terms of use cover those.
const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",
  "ClaudeBot", "Claude-Web", "anthropic-ai",
  "CCBot", "Google-Extended", "Applebot-Extended",
  "PerplexityBot", "Perplexity-User", "Bytespider",
  "Amazonbot", "meta-externalagent", "FacebookBot",
  "cohere-ai", "cohere-training-data-crawler", "Diffbot",
  "ImagesiftBot", "Omgilibot", "YouBot", "Timpibot",
  "DuckAssistBot", "AI2Bot",
];

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendorhub.co.nz").replace(/\/$/, "");
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account/", "/admin/", "/moderation/", "/auth/", "/signin/", "/listings/preview/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}