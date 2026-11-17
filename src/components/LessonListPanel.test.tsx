import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LessonListPanel } from "./LessonListPanel";
import { resetProgress } from "@/lib/progress";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { lessonId?: string } }) =>
    <a href={params?.lessonId ? `/practice/${params.lessonId}` : to}>{children}</a>,
}));

describe("Track 01 lesson list", () => {
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

  it("lists lessons 01 through 13 in order and identifies the checkpoint", () => {
    render(<LessonListPanel />);
    const track = screen.getByRole("group", { name: "Track 01 - Intro to Excel" });
    const links = within(track).getAllByRole("link");

    expect(links).toHaveLength(13);
    expect(links.map((link) => link.textContent?.match(/^\d+/)?.[0])).toEqual(
      Array.from({ length: 13 }, (_, index) => String(index + 1).padStart(2, "0")),
    );
    expect(within(track).getByText("Checkpoint · Easy · Medium · Hard")).toBeInTheDocument();
    expect(within(track).getByText("0/13")).toBeInTheDocument();
  });
});
