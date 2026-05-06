import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { HistoryScreen } from "./history-screen";

export default function HistoryPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <HistoryScreen />
      </AtelierShell>
    </ProtectedApp>
  );
}
