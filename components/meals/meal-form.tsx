"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

const mealEmotions = [
  { value: "happy", label: "Happy" },
  { value: "normal", label: "Normal" },
  { value: "stress", label: "Stress" },
  { value: "tired", label: "Tired" },
  { value: "sad", label: "Sad" },
  { value: "angry", label: "Angry" }
];

const mealContexts = [
  { value: "normal_meal", label: "Normal meal" },
  { value: "company_dinner", label: "Company dinner" },
  { value: "late_night", label: "Late night" },
  { value: "delivery", label: "Delivery" },
  { value: "home_meal", label: "Home meal" },
  { value: "rushed", label: "Rushed" }
];

export function MealForm() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  function onImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedImage(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      event.target.value = "";
      setSelectedImage(null);
      setStatus("Use a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      event.target.value = "";
      setSelectedImage(null);
      setStatus("Image file must be 6MB or smaller.");
      return;
    }

    setStatus(null);
    setSelectedImage(file);
  }

  function clearSelectedImage() {
    setSelectedImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  async function onAnalyze() {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      'textarea[name="rawText"]'
    );
    const foodName = textarea?.value.trim() ?? "";

    if (!foodName && !selectedImage) {
      setStatus("Enter a meal description or upload a meal image before analysis.");
      return;
    }

    setStatus(null);
    setIsAnalyzing(true);

    try {
      const result = await runMealAnalysis(foodName, selectedImage);
      setAnalysis(result);
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
    let nextAnalysis = analysis;
    let rawText = String(formData.get("rawText") ?? "").trim();
    const mealType = String(formData.get("mealType") ?? "other");
    const emotion = String(formData.get("emotion") ?? "normal");
    const context = String(formData.get("context") ?? "normal_meal");
    const eatenAt = String(formData.get("eatenAt") ?? "");

    if (!rawText && !selectedImage) {
      setStatus("Enter a meal description or upload a meal image before saving.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (!nextAnalysis) {
        setStatus("Analyzing calories and nutrients before saving...");
        nextAnalysis = await runMealAnalysis(rawText, selectedImage);
        setAnalysis(nextAnalysis);
      }

      rawText = rawText || nextAnalysis.food_name;

      const response = await fetchWithSupabaseAuth("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input_type: selectedImage ? "image_text" : "text",
          meal_type: mealType,
          emotion,
          context,
          raw_text: rawText,
          eaten_at: eatenAt ? new Date(eatenAt).toISOString() : undefined,
          analysis: nextAnalysis
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
      clearSelectedImage();
      setAnalysis(null);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              name="emotion"
              defaultValue="normal"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mealEmotions.map((emotion) => (
                <option key={emotion.value} value={emotion.value}>
                  {emotion.label}
                </option>
              ))}
            </select>
            <select
              name="context"
              defaultValue="normal_meal"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {mealContexts.map((context) => (
                <option key={context.value} value={context.value}>
                  {context.label}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            name="rawText"
            placeholder="Describe the meal, mood, and situation."
            rows={6}
          />
          <div className="grid gap-3 rounded-md border border-dashed bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Meal image</p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or WEBP up to 6MB.
                </p>
              </div>
              <Input
                ref={imageInputRef}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sm:max-w-xs"
                onChange={onImageChange}
              />
            </div>
            {previewUrl ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border bg-background sm:w-56">
                  <Image
                    src={previewUrl}
                    alt="Selected meal"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <Button type="button" variant="outline" onClick={clearSelectedImage}>
                  Remove image
                </Button>
              </div>
            ) : null}
          </div>
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

async function runMealAnalysis(foodName: string, image: File | null) {
  const response = image
    ? await analyzeWithImage(foodName, image)
    : await analyzeWithText(foodName);
  const payload = await response.json();

  if (response.status === 401) {
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to analyze meal.");
  }

  return payload as FoodAnalysisResult;
}

function analyzeWithText(foodName: string) {
  return fetchWithSupabaseAuth("/api/meals/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      food_name: foodName
    })
  });
}

function analyzeWithImage(foodName: string, image: File) {
  const formData = new FormData();

  if (foodName) {
    formData.append("food_name", foodName);
  }

  formData.append("image", image);

  return fetchWithSupabaseAuth("/api/meals/analyze", {
    method: "POST",
    body: formData
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
