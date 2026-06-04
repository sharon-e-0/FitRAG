"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
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

      event.currentTarget.reset();
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save meal"}
          </Button>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
