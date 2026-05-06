import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { BatchScreen } from "./batch-screen";

export default function BatchPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <BatchScreen />
      </AtelierShell>
    </ProtectedApp>
  );
}
