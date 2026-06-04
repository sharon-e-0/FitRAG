import { AppShell } from "@/components/layout/app-shell";
import { CoachClient } from "@/components/coach/coach-client";

export default function CoachPage() {
  return (
    <AppShell>
      <CoachClient />
    </AppShell>
  );
}
