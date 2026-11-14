import { describe, expect, it } from "vitest";
import { workbookSchema } from "./lesson-schema";

describe("lesson workbook schema", () => {
  it("accepts multiple named sheets and named ranges", () => {
    const workbook = workbookSchema.safeParse({
      sheets: [
        { name: "Orders", cells: { A1: "Units", B1: 4 } },
        { name: "Inputs", cells: { A1: "Tax rate", B1: 0.1 } },
      ],
      named_ranges: { TaxRate: "Inputs!$B$1" },
    });

    expect(workbook.success).toBe(true);
    if (workbook.success) expect(workbook.data.named_ranges).toEqual({ TaxRate: "Inputs!$B$1" });
  });
});
