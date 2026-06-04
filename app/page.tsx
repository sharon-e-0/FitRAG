import Link from "next/link";
import { Activity, Bot, Camera, LineChart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Meal intelligence",
    description: "Analyze food photos and text logs into calories and nutrients.",
    icon: Camera
  },
  {
    title: "Emotion patterns",
    description: "Connect stress, situation tags, and eating behavior.",
    icon: Activity
  },
  {
    title: "RAG coach",
    description: "Search personal records before generating coaching answers.",
    icon: Bot
  },
  {
    title: "Weight forecast",
    description: "Estimate 7, 14, and 30 day weight movement from recent trends.",
    icon: LineChart
  }
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex rounded-md border bg-card px-3 py-1 text-sm text-muted-foreground">
            Gemini + Supabase + Health Connect
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              FitRAG
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              A personal health system that unifies meals, emotions, activity,
              weight records, and RAG-based AI coaching.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/meals/new">Log meal</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Metric label="Calories" value="1,860 kcal" />
            <Metric label="Protein" value="82 g" />
            <Metric label="Steps" value="7,240" />
            <Metric label="Mood signal" value="Stress rising" />
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader className="space-y-3">
              <feature.icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {feature.description}
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
