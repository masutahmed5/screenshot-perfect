import { describe, expect, it } from "vitest";
import { SUPPORTED_FUNCTIONS } from "./formula";

const requiredFunctions = [
  "MEDIAN", "MODE", "LARGE", "SMALL", "ROUNDUP", "ROUNDDOWN", "FLOOR", "CEILING", "ODD", "EVEN",
  "IFS", "SWITCH", "XOR", "ISBLANK", "ISERROR", "ISERR", "ISNA", "ISNUMBER", "ISTEXT", "ISNONTEXT",
  "ISLOGICAL", "ISFORMULA", "IFNA", "AGGREGATE", "HLOOKUP", "TEXT", "CLEAN", "TEXTBEFORE", "TEXTAFTER",
  "DATE", "TODAY", "DATEDIF", "DAYS", "WORKDAY", "NETWORKDAYS", "EOMONTH", "AVERAGEIFS", "MAXIFS",
  "MINIFS", "SUMPRODUCT", "UNIQUE", "FILTER", "SORT", "SORTBY", "LET",
];

describe("lesson formula engine coverage", () => {
  it("supports the required lesson function set", () => {
    expect(SUPPORTED_FUNCTIONS).toEqual(expect.arrayContaining(requiredFunctions));
  });
});
