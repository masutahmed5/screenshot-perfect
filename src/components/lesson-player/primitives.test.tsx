import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProgressRing, SegmentedControl } from "./primitives";

const options = [
  { value: "windows", label: "Windows" },
  { value: "mac", label: "Mac" },
  { value: "unavailable", label: "Unavailable", disabled: true },
];

function PlatformChoice() {
  const [value, setValue] = useState("windows");
  return <SegmentedControl label="Platform" value={value} onValueChange={setValue} options={options} />;
}

describe("lesson-player presentation controls", () => {
  it("keeps exactly one platform selected, including when clicked again", () => {
    render(<PlatformChoice />);
    const mac = screen.getByRole("radio", { name: "Mac" });
    fireEvent.click(mac);
    expect(mac).toBeChecked();
    expect(screen.getByRole("radio", { name: "Windows" })).not.toBeChecked();
    fireEvent.click(mac);
    expect(mac).toBeChecked();
  });

  it("supports arrow-key navigation and skips unavailable options", async () => {
    render(<PlatformChoice />);
    const windows = screen.getByRole("radio", { name: "Windows" });
    act(() => windows.focus());
    fireEvent.keyDown(windows, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("radio", { name: "Mac" })).toBeChecked());
    fireEvent.keyDown(screen.getByRole("radio", { name: "Mac" }), { key: "ArrowRight" });
    await waitFor(() => expect(windows).toBeChecked());
  });

  it("does not emit a choice when an unavailable option is clicked", () => {
    const change = vi.fn();
    render(<SegmentedControl label="Platform" value="windows" onValueChange={change} options={options} />);
    fireEvent.click(screen.getByRole("radio", { name: "Unavailable" }));
    expect(change).not.toHaveBeenCalled();
  });

  it.each([[14, 10, 10], [-2, 10, 0], [2, 0, 0]])("bounds progress %s of %s to %s", (value, max, expected) => {
    render(<ProgressRing value={value} max={max} label="Track progress" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(expected));
  });
});