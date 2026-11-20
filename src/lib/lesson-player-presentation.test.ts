import { describe, expect, it } from "vitest";
import { clampPaneRatio, allowsDoubleEscape, shortcutChecklist } from "./lesson-player-presentation";
import { formulaLesson } from "@/test/fixtures/formula-lessons";
import type { LessonContentStep } from "./lesson-schema";

describe("workspace presentation safeguards",()=>{
  it("enforces 260px Learn and 480px Practice minimums",()=>{
    expect(clampPaneRatio(0,1000)).toBe(26);
    expect(clampPaneRatio(100,1000)).toBe(52);
  });
  it("defaults to the narrower 32 percent lesson panel",()=>{
    expect(clampPaneRatio(Number.NaN,1000)).toBe(32);
    expect(clampPaneRatio(28,1400)).toBe(28);
  });
  it("does not release on double Escape when the lesson expects Escape",()=>{
    const first=formulaLesson.steps[0]; if(!first) throw new Error("Missing fixture");
    const step={...first,type:"shortcut",validation:{mode:"shortcut",start_cell:"A1",target:"A1",accepted_sequences:{windows:[["Esc"]],mac:[["Esc"]]}}} as LessonContentStep;
    expect(allowsDoubleEscape(step,"windows")).toBe(false);
    expect(allowsDoubleEscape(first,"windows")).toBe(true);
  });
  it("requires all of 500 before completing the typing checklist item",()=>{
    const expected=["TYPE:5","TYPE:0","TYPE:0","ENTER"];
    expect(shortcutChecklist(expected,["TYPE:5"])[0]?.done).toBe(false);
    expect(shortcutChecklist(expected,expected)[0]).toEqual({id:"2",label:"Type 500",done:true});
    expect(shortcutChecklist(expected,["TYPE:5","TYPE:9","TYPE:0"])[0]?.done).toBe(false);
  });
});