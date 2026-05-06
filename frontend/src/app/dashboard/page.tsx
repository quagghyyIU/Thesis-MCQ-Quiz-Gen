import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { DashboardScreen } from "./dashboard-screen";

export default function DashboardPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <DashboardScreen />
      </AtelierShell>
    </ProtectedApp>
  );
}
