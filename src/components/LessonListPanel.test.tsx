import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LessonListPanel } from "./LessonListPanel";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params }: { children: ReactNode; params?: { lessonId?: string } }) =>
    <a href={`/practice/${params?.lessonId}`}>{children}</a>,
}));

describe("active lesson browser", () => {
  it("offers only the 23 updated Track 01 and 02 lessons", () => {
    render(<LessonListPanel />);
    const links = within(screen.getByRole("navigation", { name: "Lesson list" })).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      Array.from({ length: 23 }, (_, index) => `/practice/L${String(index + 1).padStart(3, "0")}`),
    );
    expect(screen.getByRole("progressbar", { name: "Lessons completed" })).toHaveAttribute("aria-valuemax", "23");
  });
});