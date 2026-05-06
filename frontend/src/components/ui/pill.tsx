import { cn } from "@/lib/utils";

type PillTone = "accent" | "success" | "warning" | "danger" | "muted" | "outline";

const toneClasses: Record<PillTone, string> = {
  accent:  "bg-[var(--at-accent-soft)] text-[var(--at-accent-ink)] border-[var(--at-accent-soft)]",
  success: "bg-[#e6f1ea] text-[var(--at-success)] border-[#cfe4d6]",
  warning: "bg-[#f6edda] text-[var(--at-warning)] border-[#e8d5a8]",
  danger:  "bg-[#fde8e8] text-[var(--at-danger)] border-[#f4c4c4]",
  muted:   "bg-[var(--at-surface-muted)] text-[var(--at-text-muted)] border-[var(--at-border)]",
  outline: "bg-transparent text-[var(--at-text-muted)] border-[var(--at-border)]",
};

interface PillProps {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}

export function Pill({ tone = "muted", children, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
