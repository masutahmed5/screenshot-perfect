import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Gridwise" },
      { name: "description", content: "How Gridwise handles your information." },
      { property: "og:title", content: "Privacy Policy · Gridwise" },
      { property: "og:description", content: "How Gridwise handles your information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b"><div className="mx-auto max-w-3xl px-6 py-5"><Link to="/"><Logo /></Link></div></header>
      <main className="mx-auto max-w-3xl px-6 py-16 leading-relaxed">
        <h1 className="font-serif text-4xl tracking-tight">Privacy Policy</h1>
        <h2 className="mt-10 text-lg font-semibold">What we collect</h2>
        <p className="mt-3 text-muted-foreground">No account is required. Lesson progress is stored only in your browser on your device.</p>
        <h2 className="mt-10 text-lg font-semibold">How it is used</h2>
        <p className="mt-3 text-muted-foreground">Your saved progress is used only to show completed lessons and items to review.</p>
        <h2 className="mt-10 text-lg font-semibold">Sharing</h2>
        <p className="mt-3 text-muted-foreground">We do not sell or share your personal information.</p>
        <h2 className="mt-10 text-lg font-semibold">Your choices</h2>
        <p className="mt-3 text-muted-foreground">You can delete your progress at any time by clearing your browser's site data.</p>
        <h2 className="mt-10 text-lg font-semibold">Contact</h2>
        <p className="mt-3 text-muted-foreground">Questions about privacy? Reach out to the Gridwise team.</p>
      </main>
    </div>
  );
}
