import { cn } from "@/lib/utils";

interface AtelierSurfaceProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function AtelierSurface({ children, className, style }: AtelierSurfaceProps) {
  return (
    <div
      className={cn("rounded-[var(--at-radius)] border border-[var(--at-border)]", className)}
      style={{ background: "var(--at-surface)", ...style }}
    >
      {children}
    </div>
  );
}
