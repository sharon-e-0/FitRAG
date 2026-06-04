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

const supportedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);
const previewableImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSelectedImageBytes = 12 * 1024 * 1024;
const maxUploadImageSizeMb = 2;
const maxUploadImageDimension = 1600;

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

const nutrientFields = [
  { key: "calories", label: "Calories", unit: "kcal", step: "1" },
  { key: "carbs", label: "Carbs", unit: "g", step: "0.1" },
  { key: "protein", label: "Protein", unit: "g", step: "0.1" },
  { key: "fat", label: "Fat", unit: "g", step: "0.1" },
  { key: "sugar", label: "Sugar", unit: "g", step: "0.1" },
  { key: "sodium", label: "Sodium", unit: "mg", step: "1" }
] as const;

type NumericAnalysisKey = (typeof nutrientFields)[number]["key"];

export function MealForm() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    if (!previewableImageTypes.has(selectedImage.type)) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  async function onImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedImage(null);
      setAnalysis(null);
      return;
    }

    const mimeType = getImageMimeType(file);

    if (!mimeType || !supportedImageTypes.has(mimeType)) {
      event.target.value = "";
      setSelectedImage(null);
      setStatus("Use a JPEG, PNG, WEBP, HEIC, or HEIF image.");
      return;
    }

    if (file.size > maxSelectedImageBytes) {
      event.target.value = "";
      setSelectedImage(null);
      setStatus("Image file must be 12MB or smaller.");
      return;
    }

    setStatus("Preparing image...");
    setIsProcessingImage(true);
    setAnalysis(null);

    try {
      const normalizedImage = await normalizeMealImage(file);
      setSelectedImage(normalizedImage);
      setStatus(
        normalizedImage.name !== file.name || normalizedImage.size < file.size
          ? "Image converted and compressed for analysis."
          : null
      );
    } catch (error) {
      event.target.value = "";
      setSelectedImage(null);
      setStatus(error instanceof Error ? error.message : "Failed to prepare image.");
    } finally {
      setIsProcessingImage(false);
    }
  }

  function clearSelectedImage() {
    setSelectedImage(null);
    setAnalysis(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function updateFoodName(value: string) {
    setAnalysis((current) => (current ? { ...current, food_name: value } : current));
  }

  function updateNumericAnalysisField(key: NumericAnalysisKey, value: string) {
    const parsed = Number(value);

    setAnalysis((current) =>
      current
        ? {
            ...current,
            [key]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
          }
        : current
    );
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
      setStatus(
        result.analysis_source === "fallback"
          ? result.warning ?? "Estimated result generated. Please review before final save."
          : "Analysis completed. Review and edit the values before final save."
      );
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

    if (!analysis) {
      setStatus("Run AI analysis and review the nutrition values before final save.");
      setIsSubmitting(false);
      return;
    }

    if (!analysis.food_name.trim()) {
      setStatus("Food name is required before final save.");
      setIsSubmitting(false);
      return;
    }

    try {
      rawText = rawText || analysis.food_name;

      const saveFormData = new FormData();
      saveFormData.set("input_type", selectedImage ? "image_text" : "text");
      saveFormData.set("meal_type", mealType);
      saveFormData.set("emotion", emotion);
      saveFormData.set("context", context);
      saveFormData.set("raw_text", rawText);
      saveFormData.set("analysis", JSON.stringify(analysis));

      if (eatenAt) {
        saveFormData.set("eaten_at", new Date(eatenAt).toISOString());
      }

      if (selectedImage) {
        saveFormData.set("image", selectedImage);
      }

      const response = await fetchWithSupabaseAuth("/api/meals", {
        method: "POST",
        body: saveFormData
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
            onChange={() => setAnalysis(null)}
          />
          <div className="grid gap-3 rounded-md border border-dashed bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Meal image</p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or WEBP up to 12MB.
                </p>
              </div>
              <Input
                ref={imageInputRef}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                className="sm:max-w-xs"
                onChange={onImageChange}
              />
            </div>
            {selectedImage ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {previewUrl ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border bg-background sm:w-56">
                    <Image
                      src={previewUrl}
                      alt="Selected meal"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex min-h-28 w-full items-center justify-center rounded-md border bg-background px-3 text-center text-sm text-muted-foreground sm:w-56">
                    {selectedImage.name}
                  </div>
                )}
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
              disabled={isAnalyzing || isSubmitting || isProcessingImage}
              onClick={onAnalyze}
            >
              {getAnalyzeButtonLabel(isProcessingImage, isAnalyzing)}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isAnalyzing || isProcessingImage || !analysis}
            >
              {isSubmitting ? "Saving..." : "최종 저장"}
            </Button>
          </div>
          {analysis ? (
            <div className="grid gap-4 rounded-md border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Analysis result</span>
                {analysis.analysis_source === "fallback" ? (
                  <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                    fallback estimate - review required
                  </span>
                ) : null}
              </div>
              {analysis.analysis_source === "fallback" && analysis.warning ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  {analysis.warning}
                </p>
              ) : null}
              <label className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground">Food name</span>
                <Input
                  value={analysis.food_name}
                  onChange={(event) => updateFoodName(event.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {nutrientFields.map((field) => (
                  <label key={field.key} className="grid gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {field.label} ({field.unit})
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step={field.step}
                      value={analysis[field.key]}
                      onChange={(event) =>
                        updateNumericAnalysisField(field.key, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
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
    const detail =
      typeof payload.detail === "string" && payload.detail
        ? ` ${payload.detail}`
        : "";
    throw new Error(`${payload.error ?? "Failed to analyze meal."}${detail}`);
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

async function analyzeWithImage(foodName: string, image: File) {
  const formData = new FormData();
  const mimeType = getImageMimeType(image);
  const uploadImage = await prepareImageForAnalysis(image, mimeType);

  if (foodName) {
    formData.append("food_name", foodName);
  }

  formData.append("image", uploadImage);

  return fetchWithSupabaseAuth("/api/meals/analyze", {
    method: "POST",
    body: formData
  });
}

async function prepareImageForAnalysis(image: File, mimeType: string) {
  return normalizeMealImage(mimeType ? new File([image], image.name, { type: mimeType }) : image);
}

async function normalizeMealImage(image: File) {
  const mimeType = getImageMimeType(image);

  if (!mimeType || !supportedImageTypes.has(mimeType)) {
    throw new Error("Use a JPEG, PNG, WEBP, HEIC, or HEIF image.");
  }

  const jpegImage = isHeicImage(image)
    ? await convertHeicToJpeg(image)
    : new File([image], image.name, { type: mimeType });
  const imageCompression = (await import("browser-image-compression")).default;
  const compressed = await imageCompression(jpegImage, {
    maxSizeMB: maxUploadImageSizeMb,
    maxWidthOrHeight: maxUploadImageDimension,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.82
  });

  return new File([compressed], toJpegFileName(jpegImage.name), {
    type: "image/jpeg"
  });
}

async function convertHeicToJpeg(image: File) {
  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: image,
    toType: "image/jpeg",
    quality: 0.86
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  return new File([blob], toJpegFileName(image.name), {
    type: "image/jpeg"
  });
}

function isHeicImage(file: File) {
  const mimeType = getImageMimeType(file);
  return mimeType === "image/heic" || mimeType === "image/heif";
}

function toJpegFileName(fileName: string) {
  return fileName.includes(".")
    ? fileName.replace(/\.[^.]+$/, ".jpg")
    : `${fileName}.jpg`;
}

function getImageMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  if (extension === "webp") {
    return "image/webp";
  }

  if (extension === "heic") {
    return "image/heic";
  }

  if (extension === "heif") {
    return "image/heif";
  }

  return "";
}

function getAnalyzeButtonLabel(isProcessingImage: boolean, isAnalyzing: boolean) {
  if (isProcessingImage) {
    return "Preparing image...";
  }

  if (isAnalyzing) {
    return "Analyzing...";
  }

  return "AI 분석 및 확인";
}
