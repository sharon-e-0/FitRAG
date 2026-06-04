"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";
import type { FoodAnalysisResult } from "@/types/food-analysis";

const mealTypes = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "late_night", label: "Late night" },
  { value: "other", label: "Other" }
];

export function MealForm() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);

  async function onAnalyze() {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="rawText"]'
    );
    const foodName = textarea?.value.trim() ?? "";

    if (!foodName) {
      setStatus("Enter a meal description before analysis.");
      return;
    }

    setStatus(null);
    setIsAnalyzing(true);

    try {
      const response = await fetchWithSupabaseAuth("/api/meals/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          food_name: foodName
        })
      });
      const payload = await response.json();

      if (response.status === 401) {
        setStatus("Your session has expired. Please log in again.");
        router.push("/login?next=/meals/new");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to analyze meal.");
      }

      setAnalysis(payload as FoodAnalysisResult);
      setStatus("Meal analysis completed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to analyze meal.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus(null);
    setIsSubmitting(true);

    const formData = new FormData(form);
    const rawText = String(formData.get("rawText") ?? "").trim();
    const mealType = String(formData.get("mealType") ?? "other");
    const eatenAt = String(formData.get("eatenAt") ?? "");

    try {
      const response = await fetchWithSupabaseAuth("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          meal_type: mealType,
          raw_text: rawText,
          eaten_at: eatenAt ? new Date(eatenAt).toISOString() : undefined
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setStatus("Your session has expired. Please log in again.");
          router.push("/login?next=/meals/new");
          return;
        }

        throw new Error(payload.error ?? "Failed to save meal.");
      }

      const meal = payload.meal as { id?: string } | undefined;

      if (meal?.id) {
        void fetchWithSupabaseAuth("/api/rag/food-records/embed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            food_record_id: meal.id
          })
        });
      }

      form.reset();
      setStatus("Meal saved successfully.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save meal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              name="mealType"
              defaultValue="other"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mealTypes.map((mealType) => (
                <option key={mealType.value} value={mealType.value}>
                  {mealType.label}
                </option>
              ))}
            </select>
            <Input name="eatenAt" type="datetime-local" />
          </div>
          <Textarea
            name="rawText"
            placeholder="Describe the meal, mood, and situation."
            rows={6}
            required
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={isAnalyzing || isSubmitting}
              onClick={onAnalyze}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze meal"}
            </Button>
            <Button type="submit" disabled={isSubmitting || isAnalyzing}>
              {isSubmitting ? "Saving..." : "Save meal"}
            </Button>
          </div>
          {analysis ? (
            <div className="grid gap-3 rounded-md border bg-muted/30 p-4 text-sm sm:grid-cols-2">
              <div className="font-medium sm:col-span-2">{analysis.food_name}</div>
              <Metric label="Calories" value={`${analysis.calories} kcal`} />
              <Metric label="Carbs" value={`${analysis.carbs} g`} />
              <Metric label="Protein" value={`${analysis.protein} g`} />
              <Metric label="Fat" value={`${analysis.fat} g`} />
              <Metric label="Sugar" value={`${analysis.sugar} g`} />
              <Metric label="Sodium" value={`${analysis.sodium} mg`} />
            </div>
          ) : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
