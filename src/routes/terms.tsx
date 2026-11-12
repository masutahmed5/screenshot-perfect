import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use · Gridwise" },
      { name: "description", content: "The terms for using Gridwise Excel practice." },
      { property: "og:title", content: "Terms of Use · Gridwise" },
      { property: "og:description", content: "The terms for using Gridwise Excel practice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b"><div className="mx-auto max-w-3xl px-6 py-5"><Link to="/"><Logo /></Link></div></header>
      <main className="mx-auto max-w-3xl px-6 py-16 leading-relaxed">
        <h1 className="font-serif text-4xl tracking-tight">Terms of Use</h1>
        <h2 className="mt-10 text-lg font-semibold">Using Gridwise</h2>
        <p className="mt-3 text-muted-foreground">Gridwise offers free, browser-based Excel practice. By using it you agree to these terms.</p>
        <h2 className="mt-10 text-lg font-semibold">Your progress</h2>
        <p className="mt-3 text-muted-foreground">Progress is saved on your own device. Clearing your browser data removes it.</p>
        <h2 className="mt-10 text-lg font-semibold">Acceptable use</h2>
        <p className="mt-3 text-muted-foreground">Do not misuse the service, attempt to disrupt it, or copy its lessons for resale.</p>
        <h2 className="mt-10 text-lg font-semibold">No warranty</h2>
        <p className="mt-3 text-muted-foreground">Gridwise is provided as is. Lessons are for learning and may not cover every Excel version.</p>
        <h2 className="mt-10 text-lg font-semibold">Changes</h2>
        <p className="mt-3 text-muted-foreground">We may update these terms. Continued use means you accept the latest version.</p>
      </main>
    </div>
  );
}
