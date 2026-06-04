"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";
import type { FoodRecord, MealContext, MealEmotion } from "@/types/database";

type EditMealDialogProps = {
  meal: FoodRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (meal: FoodRecord) => void;
};

const emotionOptions: { value: MealEmotion; label: string }[] = [
  { value: "happy", label: "Happy" },
  { value: "normal", label: "Normal" },
  { value: "stress", label: "Stress" },
  { value: "tired", label: "Tired" },
  { value: "sad", label: "Sad" },
  { value: "angry", label: "Angry" }
];

const contextOptions: { value: MealContext; label: string }[] = [
  { value: "normal_meal", label: "Normal meal" },
  { value: "company_dinner", label: "Company dinner" },
  { value: "late_night", label: "Late night" },
  { value: "delivery", label: "Delivery" },
  { value: "home_meal", label: "Home meal" },
  { value: "rushed", label: "Rushed" }
];

type NumericField = "calories" | "carbs" | "protein" | "fat" | "sugar" | "sodium";

export function EditMealDialog({
  meal,
  open,
  onOpenChange,
  onCompleted
}: EditMealDialogProps) {
  const primaryAnalysis = useMemo(
    () => meal?.food_analysis_results?.[0] ?? null,
    [meal]
  );
  const [foodName, setFoodName] = useState("");
  const [numbers, setNumbers] = useState<Record<NumericField, number>>({
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    sugar: 0,
    sodium: 0
  });
  const [emotion, setEmotion] = useState<MealEmotion>("normal");
  const [context, setContext] = useState<MealContext>("normal_meal");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!meal) {
      return;
    }

    setFoodName(primaryAnalysis?.food_name ?? meal.raw_text ?? "Saved meal");
    setNumbers({
      calories: Number(primaryAnalysis?.calories ?? 0),
      carbs: Number(primaryAnalysis?.carbohydrate_g ?? 0),
      protein: Number(primaryAnalysis?.protein_g ?? 0),
      fat: Number(primaryAnalysis?.fat_g ?? 0),
      sugar: Number(primaryAnalysis?.sugar_g ?? 0),
      sodium: Number(primaryAnalysis?.sodium_mg ?? 0)
    });
    setEmotion(meal.emotion ?? "normal");
    setContext(meal.context ?? "normal_meal");
    setMemo(meal.memo ?? "");
    setStatus("");
    setIsSaving(false);
  }, [meal, primaryAnalysis]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!meal || isSaving) {
      return;
    }

    setIsSaving(true);
    setStatus("식사 기록을 업데이트하는 중입니다...");

    try {
      const updateResponse = await fetchWithSupabaseAuth("/api/meals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          food_record_id: meal.id,
          food_name: foodName,
          calories: numbers.calories,
          carbs: numbers.carbs,
          protein: numbers.protein,
          fat: numbers.fat,
          sugar: numbers.sugar,
          sodium: numbers.sodium,
          emotion,
          context,
          memo
        })
      });

      if (!updateResponse.ok) {
        const payload = await readErrorPayload(updateResponse);
        throw new Error(payload || "식사 기록 수정에 실패했습니다.");
      }

      const updatePayload = (await updateResponse.json()) as { meal: FoodRecord };
      setStatus("RAG 문서를 재임베딩하는 중입니다...");

      const reEmbedResponse = await fetchWithSupabaseAuth(
        "/api/rag/food-records/re-embed",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            food_record_ids: [meal.id]
          })
        }
      );

      if (!reEmbedResponse.ok) {
        const payload = await readErrorPayload(reEmbedResponse);
        throw new Error(payload || "식사 기록은 수정됐지만 RAG 재임베딩에 실패했습니다.");
      }

      setStatus("수정과 RAG 반영이 완료되었습니다.");
      onCompleted(updatePayload.meal);
      onOpenChange(false);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "수정 중 알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function updateNumber(key: NumericField, value: string) {
    setNumbers((current) => ({
      ...current,
      [key]: value === "" ? 0 : Number(value)
    }));
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>식사 기록 수정</DialogTitle>
          <DialogDescription>
            저장된 식사와 영양소를 수정하면 DB 업데이트 후 RAG 벡터가 순서대로 다시 생성됩니다.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Food name</span>
            <Input
              value={foodName}
              onChange={(event) => setFoodName(event.target.value)}
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInput label="Calories (kcal)" value={numbers.calories} onChange={(value) => updateNumber("calories", value)} />
            <NumberInput label="Carbs (g)" value={numbers.carbs} onChange={(value) => updateNumber("carbs", value)} />
            <NumberInput label="Protein (g)" value={numbers.protein} onChange={(value) => updateNumber("protein", value)} />
            <NumberInput label="Fat (g)" value={numbers.fat} onChange={(value) => updateNumber("fat", value)} />
            <NumberInput label="Sugar (g)" value={numbers.sugar} onChange={(value) => updateNumber("sugar", value)} />
            <NumberInput label="Sodium (mg)" value={numbers.sodium} onChange={(value) => updateNumber("sodium", value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Emotion</span>
              <select
                className="flex h-10 w-full rounded-full border border-[#F0EDE9] bg-white px-4 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#FF7E67]"
                value={emotion}
                onChange={(event) => setEmotion(event.target.value as MealEmotion)}
              >
                {emotionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Context</span>
              <select
                className="flex h-10 w-full rounded-full border border-[#F0EDE9] bg-white px-4 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#4ECDC4]"
                value={context}
                onChange={(event) => setContext(event.target.value as MealContext)}
              >
                {contextOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Memo</span>
            <Textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="메모"
            />
          </label>

          {primaryAnalysis?.analysis_source === "fallback" ? (
            <div className="rounded-2xl border border-[#FFD166] bg-[#FFF8D9] px-4 py-3 text-sm text-[#8A6200]">
              기존 fallback 추정치를 수정하면 `user_edit`으로 저장되어 RAG 임베딩 대상에 포함됩니다.
            </div>
          ) : null}

          {status ? (
            <p className="text-sm leading-6 text-muted-foreground">{status}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSaving || !foodName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  반영 중
                </>
              ) : (
                "수정 완료"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NumberInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="number"
        min="0"
        step="0.1"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

async function readErrorPayload(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? "";
  } catch {
    return "";
  }
}
