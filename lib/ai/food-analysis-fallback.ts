import type { FoodAnalysisRequest, FoodAnalysisResult } from "@/types/food-analysis";

type Estimate = Omit<FoodAnalysisResult, "food_name" | "analysis_source" | "warning">;

const foodEstimates: Array<{ names: string[]; estimate: Estimate; label: string }> = [
  {
    names: ["비빔밥", "bibimbap"],
    label: "비빔밥",
    estimate: { calories: 650, carbs: 88, protein: 24, fat: 20, sugar: 9, sodium: 980 }
  },
  {
    names: ["김밥", "gimbap", "kimbap"],
    label: "김밥",
    estimate: { calories: 485, carbs: 72, protein: 15, fat: 14, sugar: 6, sodium: 820 }
  },
  {
    names: ["라면", "ramen"],
    label: "라면",
    estimate: { calories: 520, carbs: 78, protein: 12, fat: 17, sugar: 4, sodium: 1780 }
  },
  {
    names: ["치킨", "fried chicken", "chicken"],
    label: "치킨",
    estimate: { calories: 780, carbs: 42, protein: 48, fat: 46, sugar: 5, sodium: 1250 }
  },
  {
    names: ["샐러드", "salad"],
    label: "샐러드",
    estimate: { calories: 320, carbs: 22, protein: 18, fat: 18, sugar: 8, sodium: 520 }
  },
  {
    names: ["바나나", "banana"],
    label: "바나나",
    estimate: { calories: 105, carbs: 27, protein: 1, fat: 0, sugar: 14, sodium: 1 }
  },
  {
    names: ["계란", "달걀", "egg"],
    label: "계란",
    estimate: { calories: 78, carbs: 1, protein: 6, fat: 5, sugar: 1, sodium: 62 }
  },
  {
    names: ["콜라", "cola", "coke"],
    label: "콜라",
    estimate: { calories: 140, carbs: 39, protein: 0, fat: 0, sugar: 39, sodium: 45 }
  },
  {
    names: ["밥", "rice"],
    label: "밥",
    estimate: { calories: 310, carbs: 68, protein: 6, fat: 1, sugar: 0, sodium: 5 }
  },
  {
    names: ["단백질", "protein"],
    label: "단백질 식품",
    estimate: { calories: 180, carbs: 8, protein: 24, fat: 5, sugar: 3, sodium: 220 }
  }
];

const genericMeal: Estimate = {
  calories: 600,
  carbs: 72,
  protein: 24,
  fat: 22,
  sugar: 8,
  sodium: 850
};

export function estimateFoodAnalysisFallback(
  input: FoodAnalysisRequest,
  reason?: string
): FoodAnalysisResult {
  const text = input.foodName?.trim() ?? "";
  const normalized = text.toLowerCase();
  const matches = foodEstimates.filter((item) =>
    item.names.some((name) => normalized.includes(name.toLowerCase()))
  );

  if (matches.length === 0) {
    return {
      ...genericMeal,
      food_name: text || "업로드한 식사 이미지",
      analysis_source: "fallback",
      warning: buildWarning(reason)
    };
  }

  const total = matches.reduce<Estimate>(
    (sum, item) => ({
      calories: sum.calories + item.estimate.calories,
      carbs: sum.carbs + item.estimate.carbs,
      protein: sum.protein + item.estimate.protein,
      fat: sum.fat + item.estimate.fat,
      sugar: sum.sugar + item.estimate.sugar,
      sodium: sum.sodium + item.estimate.sodium
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0, sugar: 0, sodium: 0 }
  );

  return {
    calories: Math.round(total.calories),
    carbs: Math.round(total.carbs),
    protein: Math.round(total.protein),
    fat: Math.round(total.fat),
    sugar: Math.round(total.sugar),
    sodium: Math.round(total.sodium),
    food_name: matches.map((item) => item.label).join(", "),
    analysis_source: "fallback",
    warning: buildWarning(reason)
  };
}

function buildWarning(reason?: string) {
  const suffix = reason ? ` Reason: ${reason.slice(0, 180)}` : "";
  return `Gemini analysis failed, so FitRAG saved an estimated nutrition result.${suffix}`;
}
