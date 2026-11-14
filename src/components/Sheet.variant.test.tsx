import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

describe("spreadsheet variants", () => {
  it("keeps F4 reference cycling isolated to the practice variant", async () => {
    const onChange = vi.fn();
    const standard = render(<Sheet cells={{ A1: "=B1" }} onChange={onChange} cols={3} rows={3} initialSelected="A1" compact />);
    const standardBar = screen.getByRole("textbox", { name: "Formula bar for cell A1" });
    fireEvent.focus(standardBar);
    fireEvent.keyDown(standardBar, { key: "F4" });
    expect(standardBar).toHaveValue("=B1");
    standard.unmount();

    render(<Sheet cells={{ A1: "=B1" }} onChange={onChange} cols={3} rows={3} initialSelected="A1" variant="practice" />);
    const practiceBar = screen.getByRole("textbox", { name: "Formula bar for cell A1" }) as HTMLInputElement;
    fireEvent.focus(practiceBar);
    practiceBar.setSelectionRange(3, 3);
    fireEvent.keyDown(practiceBar, { key: "F4" });
    await waitFor(() => expect(practiceBar).toHaveValue("=$B$1"));
  });
});
