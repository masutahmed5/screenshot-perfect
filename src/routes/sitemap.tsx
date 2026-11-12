import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { LESSONS } from "@/lib/lessons";

export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      { title: "Sitemap · Gridwise" },
      { name: "description", content: "Every page and lesson on Gridwise." },
      { property: "og:title", content: "Sitemap · Gridwise" },
      { property: "og:description", content: "Every page and lesson on Gridwise." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SitemapPage,
});

function SitemapPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b"><div className="mx-auto max-w-3xl px-6 py-5"><Link to="/"><Logo /></Link></div></header>
      <main className="mx-auto max-w-3xl px-6 py-16 leading-relaxed">
        <h1 className="font-serif text-4xl tracking-tight">Sitemap</h1>
        <h2 className="mt-10 text-lg font-semibold">Pages</h2>
        <ul className="mt-3 space-y-2">
          <li><Link to="/" className="text-primary hover:underline">Home</Link></li>
          <li><Link to="/learn" className="text-primary hover:underline">Skill map</Link></li>
          <li><Link to="/dashboard" className="text-primary hover:underline">Dashboard</Link></li>
          <li><Link to="/review" className="text-primary hover:underline">Review</Link></li>
          <li><Link to="/terms" className="text-primary hover:underline">Terms of Use</Link></li>
          <li><Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link></li>
        </ul>
        <h2 className="mt-10 text-lg font-semibold">Lessons</h2>
        <ul className="mt-3 space-y-2">
          {LESSONS.map((l) => <li key={l.id}><Link to="/practice/$lessonId" params={{ lessonId: l.id }} className="text-primary hover:underline">{l.title}</Link></li>)}
        </ul>
        <p className="mt-10 text-sm text-muted-foreground"><a href="/sitemap.xml" className="hover:underline">XML sitemap</a></p>
      </main>
    </div>
  );
}
