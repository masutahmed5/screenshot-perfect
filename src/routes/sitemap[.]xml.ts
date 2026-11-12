import { createFileRoute } from "@tanstack/react-router";
import { LESSONS } from "@/lib/lessons";

const PAGES = ["/", "/learn", "/dashboard", "/review", "/terms", "/privacy", "/sitemap"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const paths = [...PAGES, ...LESSONS.map((l) => `/practice/${l.id}`)];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join("\n")}\n</urlset>\n`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
