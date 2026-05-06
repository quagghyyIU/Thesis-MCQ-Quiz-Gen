import { AtelierShell } from "@/components/atelier-shell";
import { ProtectedApp } from "@/components/protected-app";
import { SettingsScreen } from "./settings-screen";

export default function SettingsPage() {
  return (
    <ProtectedApp>
      <AtelierShell>
        <SettingsScreen />
      </AtelierShell>
    </ProtectedApp>
  );
}
