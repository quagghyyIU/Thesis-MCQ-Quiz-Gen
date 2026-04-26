"use client";

import { Badge } from "@/components/ui/badge";

export const BLOOM_LEVELS: Record<
  string,
  { label: string; color: string; group: string; description: string }
> = {
  remember: {
    label: "Remember",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    group: "Easy",
    description: "Recall facts and basic concepts — define, list, name, identify",
  },
  understand: {
    label: "Understand",
    color: "bg-teal-100 text-teal-700 border-teal-300",
    group: "Easy",
    description: "Explain ideas or concepts — explain, summarize, classify, compare",
  },
  apply: {
    label: "Apply",
    color: "bg-amber-100 text-amber-700 border-amber-300",
    group: "Medium",
    description: "Use information in new situations — apply, solve, implement, demonstrate",
  },
  analyze: {
    label: "Analyze",
    color: "bg-violet-100 text-violet-700 border-violet-300",
    group: "Hard",
    description: "Draw connections among ideas — analyze, differentiate, examine, categorize",
  },
  evaluate: {
    label: "Evaluate",
    color: "bg-rose-100 text-rose-700 border-rose-300",
    group: "Hard",
    description: "Justify a decision or position — evaluate, critique, assess, argue",
  },
  create: {
    label: "Create",
    color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300",
    group: "Hard",
    description: "Produce new or original work — design, develop, construct, propose",
  },
};

export function BloomBadge({ level }: { level: string }) {
  const info = BLOOM_LEVELS[level] || BLOOM_LEVELS.apply;
  return (
    <span className="relative group/bloom">
      <Badge variant="outline" className={`${info.color} cursor-help text-xs`}>
        {info.label}
      </Badge>
      <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/bloom:block w-64 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
        <span className="font-semibold">{info.label}</span>
        <span className="text-muted-foreground ml-1">({info.group})</span>
        <br />
        <span className="text-muted-foreground mt-1 block">{info.description}</span>
      </span>
    </span>
  );
}
