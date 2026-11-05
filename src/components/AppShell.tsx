import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  BookOpen,
  Flame,
  Home,
  Keyboard,
  RotateCcw,
  Briefcase,
  Target,
  Trophy,
  User,
  Sparkles,
  Menu,
  X,
  Check,
} from "lucide-react";
import { useProgress } from "@/lib/progress";
import { LESSONS } from "@/lib/lessons";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

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

  const routerState = useRouterState();
  const currentPath = routerState?.location?.pathname ?? "";
  const isPracticeView = currentPath.includes("/practice");
  const practiceMatch = currentPath.match(/\/practice\/([^/?#]+)/);
  const currentLessonId = practiceMatch ? practiceMatch[1] : null;

  // Session-only drawer open/closed state (closed by default in practice view)
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    if (isPracticeView) return false;
    return sessionStorage.getItem("gridwise_drawer_open") === "true";
  });

  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const currentLessonRef = useRef<HTMLAnchorElement | null>(null);

  const toggleDrawer = () => {
    setIsOpen((prev) => {
      const next = !prev;
      sessionStorage.setItem("gridwise_drawer_open", String(next));
      return next;
    });
  };

  const closeDrawer = () => {
    setIsOpen(false);
    sessionStorage.setItem("gridwise_drawer_open", "false");
  };

  // Close on Escape & trap Tab focus when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        hamburgerRef.current?.focus();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Initial focus into drawer
    const focusTimer = setTimeout(() => {
      const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimer);
      hamburgerRef.current?.focus();
    };
  }, [isOpen]);

  // Auto-scroll current lesson into view when opened
  useEffect(() => {
    if (isOpen && currentLessonRef.current) {
      const scrollTimer = setTimeout(() => {
        currentLessonRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
      return () => clearTimeout(scrollTimer);
    }
  }, [isOpen]);

  const nav =
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar with Hamburger + Logo on the left, Streak + XP on the right */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-background/90 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            ref={hamburgerRef}
            type="button"
            onClick={toggleDrawer}
            aria-expanded={isOpen}
            aria-controls="navigation-drawer"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            className="flex size-9 items-center justify-center rounded-lg border bg-card text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/" className="flex items-center" onClick={closeDrawer}>
            <Logo />
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5" title="Day streak">
            <Flame className="size-4 text-warning" />
            <span className="tabular-nums font-medium">{p.streak}</span>
          </span>
          <span className="rounded-full border bg-card px-3 py-1 tabular-nums font-medium text-xs sm:text-sm shadow-xs">
            {p.xp} <span className="text-muted-foreground">XP</span>
          </span>
        </div>
      </header>

      {/* Dim scrim overlay (does NOT shift page layout) */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition-opacity duration-[250ms] ease-out motion-reduce:transition-none motion-reduce:duration-0",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Slide-in Drawer (250ms slide animation, disabled under prefers-reduced-motion) */}
      <aside
        id="navigation-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col border-r bg-sidebar p-4 shadow-2xl transition-transform duration-[250ms] ease-out motion-reduce:transition-none motion-reduce:duration-0",
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        <div className="mb-6 flex items-center justify-between px-2 pt-1">
          <Link to="/" onClick={closeDrawer}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close drawer"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <nav className="flex flex-col gap-1" aria-label="Main">
            <Link
              to="/dashboard"
              onClick={closeDrawer}
              className={nav}
              activeProps={{ className: "bg-sidebar-accent !text-foreground font-medium" }}
            >
              <Home className="size-4" />
              Today
            </Link>
            <Link
              to="/learn"
              onClick={closeDrawer}
              className={nav}
              activeProps={{ className: "bg-sidebar-accent !text-foreground font-medium" }}
            >
              <BookOpen className="size-4" />
              Learn
            </Link>
            <Link
              to="/review"
              onClick={closeDrawer}
              className={nav}
              activeProps={{ className: "bg-sidebar-accent !text-foreground font-medium" }}
            >
              <RotateCcw className="size-4" />
              Review
              {reviewCount > 0 && (
                <span className="ml-auto rounded-full bg-accent px-1.5 text-[11px] font-medium text-accent-foreground">
                  {reviewCount}
                </span>
              )}
            </Link>

            {/* Full lesson list grouped by skill with check marks and current lesson highlighted */}
            <div className="mt-5 mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
              Practice Lessons
            </div>
            <div className="flex flex-col gap-1">
              {LESSONS.map((l) => {
                const isCurrent = currentLessonId === l.id;
                const completedSteps = l.steps.filter((s) => p.completed[s.id]).length;
                const isAllDone = completedSteps === l.steps.length;

                return (
                  <Link
                    key={l.id}
                    ref={isCurrent ? currentLessonRef : null}
                    to="/practice/$lessonId"
                    params={{ lessonId: l.id }}
                    onClick={closeDrawer}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors",
                      isCurrent
                        ? "bg-primary/15 text-primary font-semibold border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    )}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-[10px] uppercase tracking-wider opacity-70">{l.track}</span>
                      <span className="truncate font-medium">{l.title}</span>
                    </div>
                    {isAllDone ? (
                      <span className="grid size-5 place-items-center rounded-full bg-success-soft text-success shrink-0" title="Completed">
                        <Check className="size-3" />
                      </span>
                    ) : completedSteps > 0 ? (
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                        {completedSteps}/{l.steps.length}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Coming soon
            </div>
            {soon.map(({ label, icon: I }) => (
              <span
                key={label}
                className={nav + " cursor-not-allowed opacity-50 hover:bg-transparent"}
                aria-disabled
              >
                <I className="size-4" />
                {label}
              </span>
            ))}
          </nav>
        </div>

        <div className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            Guest mode
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Progress is saved on this device.</p>
        </div>
      </aside>

      {/* Main content takes full width; no shifting */}
      <main className="flex-1 w-full min-w-0">{children}</main>
    </div>
  );
}
