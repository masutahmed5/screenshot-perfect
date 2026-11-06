import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  BookOpen,
  Flame,
  Home,
  RotateCcw,
  Sparkles,
  Menu,
  X,
  Check,
} from "lucide-react";
import { useProgress } from "@/lib/progress";
import { LESSONS } from "@/lib/lessons";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

function LessonList({
  currentLessonId,
  currentLessonRef,
  completedMap,
  onSelectLesson,
}: {
  currentLessonId: string | null;
  currentLessonRef: React.RefObject<HTMLAnchorElement | null>;
  completedMap: Record<string, any>;
  onSelectLesson?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border/30">
      {LESSONS.map((l, index) => {
        const isCurrent = currentLessonId === l.id;
        const completedSteps = l.steps.filter((s) => completedMap[s.id]).length;
        const isAllDone = completedSteps === l.steps.length;
        const isInProgress = !isAllDone && completedSteps > 0;

        return (
          <Link
            key={l.id}
            ref={isCurrent ? currentLessonRef : null}
            to="/practice/$lessonId"
            params={{ lessonId: l.id }}
            onClick={onSelectLesson}
            className={cn(
              "group flex items-center justify-between px-4 py-3.5 text-sm transition-all text-left border-l-4",
              isCurrent
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-semibold"
                : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums shrink-0",
                  isCurrent ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/80"
                )}
              >
                {index + 1}.
              </span>
              <span className="truncate">{l.title}</span>
            </div>

            <div className="shrink-0 flex items-center">
              {isAllDone && (
                <span
                  className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  title="Completed"
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
              )}
              {isInProgress && (
                <span className="rounded bg-slate-500 dark:bg-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  IN PROGRESS
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const p = useProgress();
  const reviewCount = Object.keys(p.mistakes).length;

  const routerState = useRouterState();
  const currentPath = routerState?.location?.pathname ?? "";
  const practiceMatch = currentPath.match(/\/practice\/([^/?#]+)/);
  const currentLessonId = practiceMatch ? practiceMatch[1] : null;

  // On desktop: open by default (collapsible via hamburger).
  // On mobile (<1024px): closed by default (slide-in drawer).
  const [isPanelOpen, setIsPanelOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    if (window.innerWidth < 1024) return false;
    const saved = sessionStorage.getItem("gridwise_left_panel_desktop");
    return saved !== null ? saved === "true" : true;
  });

  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const currentLessonRef = useRef<HTMLAnchorElement | null>(null);

  const togglePanel = () => {
    setIsPanelOpen((prev) => {
      const next = !prev;
      sessionStorage.setItem("gridwise_left_panel_desktop", String(next));
      return next;
    });
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    sessionStorage.setItem("gridwise_left_panel_desktop", "false");
  };

  // Close on Escape when mobile drawer is open & handle tab trapping
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
        hamburgerRef.current?.focus();
        return;
      }

      // Tab trap when drawer is acting as modal under 1024px
      if (window.innerWidth < 1024 && e.key === "Tab" && drawerRef.current) {
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPanelOpen]);

  // Auto-scroll current lesson into view
  useEffect(() => {
    if (isPanelOpen && currentLessonRef.current) {
      const scrollTimer = setTimeout(() => {
        currentLessonRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
      return () => clearTimeout(scrollTimer);
    }
  }, [isPanelOpen, currentLessonId]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-background/90 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {currentLessonId && (
            <button
              ref={hamburgerRef}
              type="button"
              onClick={togglePanel}
              aria-expanded={isPanelOpen}
              aria-controls="all-lessons-panel"
              aria-label={isPanelOpen ? "Collapse lessons panel" : "Expand lessons panel"}
              className="flex size-9 items-center justify-center rounded-lg border bg-card text-foreground transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <Menu className="size-5" />
            </button>
          )}
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="size-3.5" />
            Today
          </Link>
          <Link
            to="/learn"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="size-3.5" />
            Learn
          </Link>
          <Link
            to="/review"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="size-3.5" />
            Review
            {reviewCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                {reviewCount}
              </span>
            )}
          </Link>

          <span className="flex items-center gap-1.5" title="Day streak">
            <Flame className="size-4 text-warning" />
            <span className="tabular-nums font-medium">{p.streak}</span>
          </span>
          <span className="rounded-full border bg-card px-3 py-1 tabular-nums font-medium text-xs sm:text-sm shadow-xs">
            {p.xp} <span className="text-muted-foreground">XP</span>
          </span>
        </div>
      </header>

      {/* App Body with Left Panel and Main Workspace */}
      <div className="flex flex-1 min-h-0 min-w-0 w-full relative">
        {/* 1. DESKTOP LEFT PANEL: Only visible when a lesson is open and panel is toggled open */}
        {isPanelOpen && currentLessonId && (
          <aside
            id="all-lessons-panel"
            className="hidden lg:flex w-[300px] shrink-0 flex-col border-r bg-card/60 transition-all duration-200"
          >
            <div className="px-4 py-3.5 border-b flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                All Lessons
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {LESSONS.length} tracks
              </span>
            </div>
            <LessonList
              currentLessonId={currentLessonId}
              currentLessonRef={currentLessonRef}
              completedMap={p.completed}
            />
            <div className="p-3 border-t">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>Guest mode · All lessons unlocked</span>
              </div>
            </div>
          </aside>
        )}

        {/* MOBILE SLIDE-IN DRAWER (under 1024px, only on practice pages) */}
        {/* Dim Scrim Overlay */}
        {currentLessonId && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] transition-opacity duration-[250ms] ease-out lg:hidden",
            isPanelOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={closePanel}
          aria-hidden="true"
        />
        )}

        {/* Drawer Panel — only on practice pages */}
        {currentLessonId && (
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="All lessons list"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col border-r bg-card shadow-2xl transition-transform duration-[250ms] ease-out motion-reduce:transition-none lg:hidden",
            isPanelOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              All Lessons
            </span>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close menu"
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
            >
              <X className="size-5" />
            </button>
          </div>

          <LessonList
            currentLessonId={currentLessonId}
            currentLessonRef={currentLessonRef}
            completedMap={p.completed}
            onSelectLesson={closePanel}
          />

          <div className="p-4 border-t space-y-2">
            <div className="flex gap-2 text-xs">
              <Link
                to="/dashboard"
                onClick={closePanel}
                className="flex-1 rounded-lg border bg-muted/50 p-2 text-center font-medium hover:bg-muted"
              >
                Today
              </Link>
              <Link
                to="/learn"
                onClick={closePanel}
                className="flex-1 rounded-lg border bg-muted/50 p-2 text-center font-medium hover:bg-muted"
              >
                Learn
              </Link>
            </div>
          </div>
        </aside>
        )}

        {/* Main Workspace (fills full width when left panel is collapsed) */}
        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
