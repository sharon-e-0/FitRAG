"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BatteryLow,
  BriefcaseBusiness,
  CloudRain,
  Flame,
  Home,
  Laugh,
  Meh,
  Moon,
  Timer,
  Truck,
  Utensils,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";
import { cn } from "@/lib/utils";
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
  {
    value: "happy",
    label: "Happy",
    Icon: Laugh,
    className: "border-[#FFD166] bg-[#FFF4CC] text-[#8A6200]"
  },
  {
    value: "normal",
    label: "Normal",
    Icon: Meh,
    className: "border-[#4ECDC4]/40 bg-[#DDF8F6] text-[#247A74]"
  },
  {
    value: "stress",
    label: "Stress",
    Icon: Zap,
    className: "border-[#C4A7FF]/50 bg-[#F0E8FF] text-[#6C46C7]"
  },
  {
    value: "tired",
    label: "Tired",
    Icon: BatteryLow,
    className: "border-[#8D8A85]/25 bg-[#F0EDE9] text-[#6D6963]"
  },
  {
    value: "sad",
    label: "Sad",
    Icon: CloudRain,
    className: "border-[#93C5FD]/50 bg-[#E8F3FF] text-[#2563A8]"
  },
  {
    value: "angry",
    label: "Angry",
    Icon: Flame,
    className: "border-[#FF7E67]/40 bg-[#FFE7E1] text-[#C2412D]"
  }
];

const mealContexts = [
  {
    value: "normal_meal",
    label: "Normal meal",
    Icon: Utensils,
    className: "border-[#4ECDC4]/40 bg-[#DDF8F6] text-[#247A74]"
  },
  {
    value: "company_dinner",
    label: "Company dinner",
    Icon: BriefcaseBusiness,
    className: "border-[#C4A7FF]/50 bg-[#F0E8FF] text-[#6C46C7]"
  },
  {
    value: "late_night",
    label: "Late night",
    Icon: Moon,
    className: "border-[#93C5FD]/50 bg-[#E8F3FF] text-[#2563A8]"
  },
  {
    value: "delivery",
    label: "Delivery",
    Icon: Truck,
    className: "border-[#FFD166] bg-[#FFF4CC] text-[#8A6200]"
  },
  {
    value: "home_meal",
    label: "Home meal",
    Icon: Home,
    className: "border-[#FFB6A6]/60 bg-[#FFECE7] text-[#B34E3F]"
  },
  {
    value: "rushed",
    label: "Rushed",
    Icon: Timer,
    className: "border-[#FF7E67]/40 bg-[#FFE7E1] text-[#C2412D]"
  }
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
type PickerOption = {
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  className: string;
};

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
  const [selectedEmotion, setSelectedEmotion] = useState("normal");
  const [selectedContext, setSelectedContext] = useState("normal_meal");

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
      if (error instanceof AuthRequiredError) {
        setStatus("로그인이 필요합니다. 식단 분석을 계속하려면 다시 로그인해 주세요.");
        router.push("/login?next=/meals/new");
        return;
      }

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
    const emotion = selectedEmotion;
    const context = selectedContext;
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
          setStatus("로그인이 필요합니다. 식사를 저장하려면 다시 로그인해 주세요.");
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
              className="flex h-10 w-full rounded-2xl border border-[#F0EDE9] bg-white px-3 py-2 text-sm transition-colors focus-visible:border-[#FF7E67] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7E67]/35"
            >
              {mealTypes.map((mealType) => (
                <option key={mealType.value} value={mealType.value}>
                  {mealType.label}
                </option>
              ))}
            </select>
            <Input name="eatenAt" type="datetime-local" />
          </div>
          <input type="hidden" name="emotion" value={selectedEmotion} />
          <input type="hidden" name="context" value={selectedContext} />
          <div className="grid gap-4">
            <TagPicker
              label="Emotion"
              options={mealEmotions}
              value={selectedEmotion}
              onChange={setSelectedEmotion}
            />
            <TagPicker
              label="Situation"
              options={mealContexts}
              value={selectedContext}
              onChange={setSelectedContext}
            />
          </div>
          <Textarea
            name="rawText"
            placeholder="Describe the meal, mood, and situation."
            rows={6}
            onChange={() => setAnalysis(null)}
          />
          <div className="grid gap-3 rounded-3xl border border-dashed border-[#F0EDE9] bg-white/70 p-4">
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
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#F0EDE9] bg-background sm:w-56">
                    <Image
                      src={previewUrl}
                      alt="Selected meal"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex min-h-28 w-full items-center justify-center rounded-3xl border border-[#F0EDE9] bg-background px-3 text-center text-sm text-muted-foreground sm:w-56">
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
            <div className="grid gap-4 rounded-3xl border border-[#F0EDE9] bg-[#FFFDFB] p-4 text-sm shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Analysis result</span>
                {analysis.analysis_source === "fallback" ? (
                  <span className="rounded-full border border-[#FFD166] bg-[#FFF4CC] px-3 py-1 text-xs font-medium text-[#8A6200]">
                    fallback estimate - review required
                  </span>
                ) : null}
              </div>
              {analysis.analysis_source === "fallback" && analysis.warning ? (
                <p className="rounded-2xl border border-[#FFD166] bg-[#FFF4CC] px-3 py-2 text-xs leading-5 text-[#8A6200]">
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

function TagPicker({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7E67]/35",
                option.className,
                isSelected
                  ? "scale-[1.03] ring-2 ring-[#FF7E67]/35"
                  : "opacity-80 hover:opacity-100"
              )}
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
                <option.Icon className="h-4 w-4" />
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

async function runMealAnalysis(foodName: string, image: File | null) {
  const response = image
    ? await analyzeWithImage(foodName, image)
    : await analyzeWithText(foodName);
  const payload = await response.json();

  if (response.status === 401) {
    throw new AuthRequiredError();
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

class AuthRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
  }
}
