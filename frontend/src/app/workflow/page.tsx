import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { WorkflowScreen } from "./workflow-screen";

export default function WorkflowPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <WorkflowScreen />
      </AtelierShell>
    </ProtectedApp>
  );
}
