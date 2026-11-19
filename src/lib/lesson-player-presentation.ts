import type { LessonContentStep } from "./lesson-schema";

export function clampPaneRatio(ratio: number, width: number) {
  const min = width >= 820 ? 340 / width * 100 : 30;
  const max = width >= 820 ? (width - 480) / width * 100 : 70;
  return Math.max(min, Math.min(max, Number.isFinite(ratio) ? ratio : 40));
}

export function allowsDoubleEscape(step: LessonContentStep, platform: "windows" | "mac") {
  return step.validation.mode !== "shortcut" || !step.validation.accepted_sequences[platform].flat().some(token => /^(esc|escape)$/i.test(token));
}

export function shortcutChecklist(sequence: string[], captured: string[]) {
  // Receives normalized expected events; group typed characters without losing
  // exact prefix evidence or marking partially typed values as completed.
  const groups: Array<{ label: string; end: number }> = [];
  sequence.forEach((token,index) => {
    const previous=groups.at(-1);
    if(token.startsWith("TYPE:") && sequence[index-1]?.startsWith("TYPE:") && previous) { previous.label+=token.slice(5); previous.end=index; }
    else groups.push({label:token.startsWith("TYPE:")?`Type ${token.slice(5)}`:token,end:index});
  });
  return groups.map(group=>({ id:String(group.end), label:group.label, done:sequence.slice(0,group.end+1).every((item,i)=>captured[i]===item) }));
}