import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PredictionPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Weight prediction</h1>
          <p className="mt-2 text-muted-foreground">
            Rule-based forecast using weight logs, intake, activity, and calorie balance.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <PredictionCard label="7 days" value="67.9 kg" />
          <PredictionCard label="14 days" value="67.5 kg" />
          <PredictionCard label="30 days" value="66.8 kg" />
        </div>
      </div>
    </AppShell>
  );
}

function PredictionCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
