import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track01Card } from "./dashboard";
import { resetProgress } from "@/lib/progress";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { lessonId?: string } }) =>
    <a href={params?.lessonId ? `/practice/${params.lessonId}` : to}>{children}</a>,
}));

describe("dashboard Track 01 card", () => {
  const values = new Map<string, string>();
  const storage = {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    storage.clear();
    resetProgress();
  });

  it("shows the 13-lesson beginner track and its checkpoint", () => {
    render(<Track01Card />);

    expect(screen.getByRole("heading", { name: "Track 01 - Intro to Excel" })).toBeInTheDocument();
    expect(screen.getByText("13 lessons · Checkpoint: Easy · Medium · Hard")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Track 01 progress" })).toHaveAttribute("aria-valuemax", "13");
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "/practice/L001");
  });
});
