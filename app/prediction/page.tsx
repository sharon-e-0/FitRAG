import { AppShell } from "@/components/layout/app-shell";
import { PredictionClient } from "@/components/prediction/prediction-client";

export default function PredictionPage() {
  return (
    <AppShell>
      <PredictionClient />
    </AppShell>
  );
}
