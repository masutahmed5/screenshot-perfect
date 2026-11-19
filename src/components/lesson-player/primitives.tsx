import type { ReactNode } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Check, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ShortcutPlatform = "windows" | "mac";

const keyNames: Record<string, [string, string]> = {
  mod: ["Ctrl", "⌘"], ctrl: ["Ctrl", "⌃"], control: ["Ctrl", "⌃"],
  cmd: ["Cmd", "⌘"], command: ["Cmd", "⌘"], meta: ["Cmd", "⌘"],
  alt: ["Alt", "⌥"], option: ["Alt", "⌥"], shift: ["Shift", "⇧"],
  enter: ["Enter ↵", "Enter ↵"], escape: ["Esc", "Esc"], esc: ["Esc", "Esc"],
  space: ["Space", "Space"], arrowleft: ["←", "←"], left: ["←", "←"],
  arrowright: ["→", "→"], right: ["→", "→"], arrowup: ["↑", "↑"],
  up: ["↑", "↑"], arrowdown: ["↓", "↓"], down: ["↓", "↓"],
};

/** Presentation only: never rewrites the chord sent to the lesson checker. */
export function Keycap({ children, platform = "windows", className }: {
  children: string; platform?: ShortcutPlatform; className?: string;
}) {
  const token = children.replace(/^\{\{|\}\}$/g, "").toLowerCase();
  const label = keyNames[token]?.[platform === "mac" ? 1 : 0] ?? children;
  return <kbd className={cn("lp-keycap", className)} aria-label={token === "mod" ? platform === "mac" ? "Command" : "Control" : children}>{label}</kbd>;
}

export function KeycapCombo({ keys, platform = "windows" }: { keys: string[]; platform?: ShortcutPlatform }) {
  return <span className="lp-keycap-combo">{keys.map((key, index) => <Keycap key={`${key}-${index}`} platform={platform}>{key}</Keycap>)}</span>;
}

export type LessonStatus = "completed" | "current" | "not-started" | "locked";
const statusLabels: Record<LessonStatus, string> = {
  completed: "Completed", current: "Current lesson", "not-started": "Not started", locked: "Locked",
};

export function StatusGlyph({ status, className }: { status: LessonStatus; className?: string }) {
  return <span role="img" aria-label={statusLabels[status]} className={cn("lp-status-glyph", `lp-status-${status}`, className)}>
    {status === "completed" ? <Check aria-hidden="true" /> : status === "locked" ? <LockKeyhole aria-hidden="true" /> : status === "current" ? <span className="lp-status-dot" /> : null}
  </span>;
}

export function ProgressRing({ value, max, label, size = 20 }: { value: number; max: number; label: string; size?: 20 | 32 }) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const safeValue = safeMax && Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const percent = safeMax ? safeValue / safeMax * 100 : 0;
  return <span className={cn("lp-progress-ring", size === 32 && "lp-progress-ring-large")} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={safeMax || 1} aria-valuenow={safeValue} aria-valuetext={safeMax ? `${safeValue} of ${safeMax}` : "No items yet"}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle className="lp-ring-track" cx="12" cy="12" r="9" /><circle className="lp-ring-value" cx="12" cy="12" r="9" pathLength="100" strokeDasharray={`${percent} 100`} /></svg>
  </span>;
}

export type SegmentOption = { value: string; label: ReactNode; disabled?: boolean };

/** Required single choice with Radix roving focus and arrow-key navigation. */
export function SegmentedControl({ label, value, onValueChange, options, className }: {
  label: string; value: string; onValueChange: (value: string) => void;
  options: SegmentOption[]; className?: string;
}) {
  return <RadioGroup.Root className={cn("lp-segmented-control", className)} aria-label={label} value={value} onValueChange={onValueChange} orientation="horizontal" loop>
    {options.map((option) => <RadioGroup.Item key={option.value} asChild value={option.value} disabled={option.disabled}>
      <Button type="button" variant="ghost" className="lp-segment">{option.label}</Button>
    </RadioGroup.Item>)}
  </RadioGroup.Root>;
}