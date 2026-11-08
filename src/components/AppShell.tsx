import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BookOpen, Flame, Home, Keyboard, RotateCcw, Briefcase, Target, Trophy, User, Sparkles } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { Logo } from "./Logo";

const soon = [
  { label: "Shortcuts", icon: Keyboard },
  { label: "Missions", icon: Target },
  { label: "Interview", icon: Briefcase },
  { label: "Leaderboard", icon: Trophy },
  { label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const p = useProgress();
  const reviewCount = Object.keys(p.mistakes).length;
  const nav = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground";
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
        <Link to="/" className="mb-8 px-3"><Logo /></Link>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          <Link to="/dashboard" className={nav} activeProps={{ className: "bg-sidebar-accent !text-foreground font-medium" }}><Home className="size-4" />Today</Link>
          <Link to="/learn" className={nav} activeProps={{ className: "bg-sidebar-accent !text-foreground font-medium" }}><BookOpen className="size-4" />Learn</Link>
          <Link to="/review" className={nav} activeProps={{ className: "bg-sidebar-accent !text-foreground font-medium" }}>
            <RotateCcw className="size-4" />Review{reviewCount > 0 && <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-medium text-accent-foreground">{reviewCount}</span>}
          </Link>
          <div className="mt-6 mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Coming soon</div>
          {soon.map(({ label, icon: I }) => (
            <span key={label} className={nav + " cursor-not-allowed opacity-50 hover:bg-transparent"} aria-disabled><I className="size-4" />{label}</span>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-primary" />Guest mode</div>
          <p className="mt-1 text-xs text-muted-foreground">Progress is saved on this device.</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-5 backdrop-blur">
          <Link to="/" className="md:hidden"><Logo /></Link>
          <div className="hidden text-sm text-muted-foreground md:block" />
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5" title="Day streak"><Flame className="size-4 text-warning" /><span className="tabular-nums font-medium">{p.streak}</span></span>
            <span className="rounded-full border bg-card px-2.5 py-0.5 tabular-nums"><span className="font-medium">{p.xp}</span> <span className="text-muted-foreground">XP</span></span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
