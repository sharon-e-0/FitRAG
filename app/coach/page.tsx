import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function CoachPage() {
  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>RAG health coach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              Ask about recent eating patterns, emotional triggers, activity,
              or expected weight movement.
            </div>
            <Textarea placeholder="What should I improve this week?" rows={6} />
            <Button>Ask coach</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Retrieved context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Meal logs</p>
            <p>Emotion tags</p>
            <p>Health Connect daily summaries</p>
            <p>Weight trend records</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
