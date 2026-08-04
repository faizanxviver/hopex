import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://hopex.site";

const PAGES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/plans", priority: "0.9", changefreq: "daily" },
  { path: "/leaderboard", priority: "0.6", changefreq: "daily" },
  { path: "/salary", priority: "0.6", changefreq: "weekly" },
  { path: "/promo", priority: "0.5", changefreq: "weekly" },
  { path: "/auth", priority: "0.5", changefreq: "monthly" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PAGES.map(
          (p) =>
            `  <url><loc>${BASE_URL}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
