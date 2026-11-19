import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sheet } from "./Sheet";

describe("spreadsheet variants", () => {
  it("releases keyboard capture on two Escapes within 600ms",()=>{
    render(<Sheet cells={{}} onChange={()=>undefined} cols={8} rows={10} variant="practice" workspaceCapture />);
    const grid=screen.getByRole("grid"); fireEvent.focus(grid);
    fireEvent.keyDown(grid,{key:"Escape"}); fireEvent.keyDown(grid,{key:"Escape"});
    expect(screen.getByRole("button",{name:"Release keyboard"})).toHaveFocus();
  });
  it("does not steal reserved browser shortcuts from capture",()=>{
    const capture=vi.fn(); render(<Sheet cells={{}} onChange={()=>undefined} cols={8} rows={10} variant="practice" workspaceCapture onShortcutKey={capture}/>);
    for(const key of ["w","t","n"]) fireEvent.keyDown(screen.getByRole("grid"),{key,ctrlKey:true});
    expect(capture).not.toHaveBeenCalled();
  });
  it("moves and highlights B3:B6 directly using Shift+Down", () => {
    render(<Sheet cells={{ B3: "1", B4: "2", B5: "3", B6: "4" }} onChange={() => undefined} cols={8} rows={10} initialSelected="B3" variant="practice" />);
    const grid = screen.getByRole("grid");
    for (let i = 0; i < 3; i++) fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    expect(screen.getByRole("textbox", { name: "Name box" })).toHaveValue("B3:B6");
    for (const name of ["B3", "B4", "B5", "B6"]) expect(screen.getByRole("gridcell", { name })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(screen.getByRole("textbox", { name: "Name box" })).toHaveValue("C3");
  });

  it("keeps live cell and formula bar synchronized while selecting references", async () => {
    render(<Sheet cells={{ A1: "2", B1: "3" }} onChange={() => undefined} cols={4} rows={5} initialSelected="C1" variant="practice" />);
    const bar = screen.getByRole("textbox", { name: "Formula bar for cell C1" });
    fireEvent.focus(bar);
    fireEvent.change(bar, { target: { value: "=SUM(" } });
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: "A1" }));
    fireEvent.mouseEnter(screen.getByRole("gridcell", { name: "B1" }));
    expect(bar).toHaveValue("=SUM(A1:B1");
    expect(screen.getByRole("textbox", { name: "Edit cell C1" })).toHaveValue("=SUM(A1:B1");
    fireEvent.mouseUp(window);
    await waitFor(() => expect(bar).toHaveValue("=SUM(A1:B1"));
  });

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
