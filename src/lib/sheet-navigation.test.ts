import { describe, expect, it } from "vitest";
import { currentRegion, jumpPosition, readSelection, selectionLabel } from "./sheet-navigation";

describe("practice selection and navigation", () => {
  it("labels B3:B6 after three Shift+Down movements", () => {
    expect(selectionLabel({ anchor: { c: 1, r: 2 }, end: { c: 1, r: 5 }, kind: "cells" })).toBe("B3:B6");
  });
  it("keeps whole-row and multi-column selections", () => {
    expect(selectionLabel({ anchor: { c: 1, r: 3 }, end: { c: 1, r: 4 }, kind: "rows" })).toBe("4:5");
    expect(selectionLabel({ anchor: { c: 3, r: 2 }, end: { c: 4, r: 2 }, kind: "cols" })).toBe("D:E");
  });
  it("jumps to the end of a data block, then the next block across a gap", () => {
    const cells = { A1: "1", A2: "2", A3: "3", A6: "6" };
    expect(jumpPosition({ c: 0, r: 0 }, 0, 1, cells, 8, 10)).toEqual({ c: 0, r: 2 });
    expect(jumpPosition({ c: 0, r: 2 }, 0, 1, cells, 8, 10)).toEqual({ c: 0, r: 5 });
  });
  it("selects the current table without including a separated table", () => {
    const region = currentRegion({ c: 1, r: 1 }, { A1: "a", B1: "b", A2: "c", B2: "d", D1: "separate" }, 8, 10);
    expect(selectionLabel(region)).toBe("A1:B2");
  });
  it("accepts J20 and B2:D9 in the name box and rejects out-of-grid positions", () => {
    expect(readSelection("J20", 10, 20)?.end).toEqual({ c: 9, r: 19 });
    const range = readSelection("B2:D9", 10, 20);
    expect(range && selectionLabel(range)).toBe("B2:D9");
    expect(readSelection("J21", 10, 20)).toBeNull();
  });
});