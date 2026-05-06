import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { UsageScreen } from "./usage-screen";

export default function UsagePage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <UsageScreen />
      </AtelierShell>
    </ProtectedApp>
  );
}
