import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { EvaluationDashboard } from "@/features/evaluation";

export default function EvaluationPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <div className="at-page-frame">
          <div className="mb-5">
            <div className="text-[12px] font-medium tracking-wider uppercase mb-1.5" style={{ color: "var(--at-text-faint)" }}>Evaluation</div>
            <h1 className="text-[1.875rem] font-medium mb-1" style={{ fontFamily: "var(--font-source-serif)", color: "var(--at-text)" }}>
              Evaluation dashboard
            </h1>
            <p className="text-[15px]" style={{ color: "var(--at-text-muted)" }}>Admin-only: run and inspect automated quality evaluation.</p>
          </div>
          <EvaluationDashboard />
        </div>
      </AtelierShell>
    </ProtectedApp>
  );
}
