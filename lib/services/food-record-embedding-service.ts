import { createHash } from "node:crypto";
import { EMBEDDING_MODEL, embedText, toPgVector } from "@/lib/ai/embedding";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import type { FoodAnalysisForEmbedding, FoodRecordForEmbedding } from "@/types/rag";

export class FoodRecordEmbeddingService {
  constructor(private readonly ragRepository: RagDocumentRepository) {}

  async embedAndStore(foodRecordId: string, userId: string) {
    const { foodRecord, analysisResults } =
      await this.ragRepository.findFoodRecordForEmbedding(foodRecordId, userId);
    const reliableAnalysisResults = analysisResults.filter(
      (result) => result.analysis_source !== "fallback"
    );

    if (analysisResults.length > 0 && reliableAnalysisResults.length === 0) {
      await this.ragRepository.deleteFoodRecordDocuments([foodRecord.id], userId);

      return {
        skipped: true,
        reason: "fallback_analysis_excluded",
        food_record_id: foodRecord.id
      };
    }

    const content = buildFoodRecordDocument(foodRecord, reliableAnalysisResults);
    const embedding = await embedText(content, "RETRIEVAL_DOCUMENT");

    const document = await this.ragRepository.upsertDocument({
      user_id: userId,
      source_type: "food_record",
      source_id: foodRecord.id,
      title: buildFoodRecordTitle(foodRecord, reliableAnalysisResults),
      content,
      metadata: {
        meal_type: foodRecord.meal_type,
        emotion: foodRecord.emotion,
        context: foodRecord.context,
        input_type: foodRecord.input_type,
        eaten_at: foodRecord.eaten_at,
        food_names: reliableAnalysisResults.map((result) => result.food_name),
        excluded_fallback_analysis_count:
          analysisResults.length - reliableAnalysisResults.length
      },
      embedding: toPgVector(embedding),
      embedding_model: EMBEDDING_MODEL,
      content_hash: hashContent(content)
    });

    return {
      skipped: false,
      document
    };
  }

  async reEmbed(foodRecordIds: string[], userId: string) {
    await this.ragRepository.deleteFoodRecordDocuments(foodRecordIds, userId);

    const results = [];

    for (const foodRecordId of foodRecordIds) {
      try {
        results.push(await this.embedAndStore(foodRecordId, userId));
      } catch (error) {
        results.push({
          skipped: true,
          reason: "embedding_failed",
          food_record_id: foodRecordId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }
}

function buildFoodRecordDocument(
  foodRecord: FoodRecordForEmbedding,
  analysisResults: FoodAnalysisForEmbedding[]
) {
  const date = new Date(foodRecord.eaten_at).toISOString().slice(0, 10);
  const mealLabel = formatMealTypeKo(foodRecord.meal_type);
  const emotionLabel = formatEmotionKo(foodRecord.emotion);
  const contextLabel = formatContextKo(foodRecord.context);
  const foodName = getFoodName(foodRecord, analysisResults);
  const nutrition = summarizeNutrition(analysisResults);
  const memoText = foodRecord.memo
    ? `사용자 메모: ${foodRecord.memo}.`
    : "사용자 메모: 없음.";

  return [
    `${date} ${mealLabel}.`,
    `${emotionLabel} 상태에서 ${contextLabel}으로 ${foodName}을 섭취.`,
    `총 ${nutrition.calories}.`,
    `탄수화물 ${nutrition.carbohydrate}.`,
    `단백질 ${nutrition.protein}.`,
    `지방 ${nutrition.fat}.`,
    memoText
  ].join("\n");
}

function getFoodName(
  foodRecord: FoodRecordForEmbedding,
  analysisResults: FoodAnalysisForEmbedding[]
) {
  const foodNames = analysisResults
    .map((result) => result.food_name)
    .filter(Boolean);

  if (foodNames.length > 0) {
    return foodNames.slice(0, 3).join(", ");
  }

  return foodRecord.raw_text ?? "식사";
}

function summarizeNutrition(analysisResults: FoodAnalysisForEmbedding[]) {
  if (analysisResults.length === 0) {
    return {
      calories: "영양 분석 전",
      carbohydrate: "영양 분석 전",
      protein: "영양 분석 전",
      fat: "영양 분석 전"
    };
  }

  return {
    calories: `${formatNutritionTotal(analysisResults, "calories")}kcal`,
    carbohydrate: `${formatNutritionTotal(analysisResults, "carbohydrate_g")}g`,
    protein: `${formatNutritionTotal(analysisResults, "protein_g")}g`,
    fat: `${formatNutritionTotal(analysisResults, "fat_g")}g`
  };
}

function buildFoodRecordTitle(
  foodRecord: FoodRecordForEmbedding,
  analysisResults: FoodAnalysisForEmbedding[]
) {
  const foodNames = analysisResults.map((result) => result.food_name).filter(Boolean);

  if (foodNames.length > 0) {
    return foodNames.slice(0, 3).join(", ");
  }

  return `${foodRecord.meal_type ?? "Meal"} record`;
}

function formatNumber(value: number | null) {
  return value ?? "unknown";
}

function formatNutritionTotal(
  analysisResults: FoodAnalysisForEmbedding[],
  key: keyof Pick<
    FoodAnalysisForEmbedding,
    "calories" | "carbohydrate_g" | "protein_g" | "fat_g"
  >
) {
  const values = analysisResults
    .map((result) => result[key])
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return "unknown";
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

function formatMealTypeKo(mealType: string | null) {
  const labels: Record<string, string> = {
    breakfast: "아침 식사",
    lunch: "점심 식사",
    dinner: "저녁 식사",
    snack: "간식",
    late_night: "야식",
    other: "식사"
  };

  return labels[mealType ?? "other"] ?? "식사";
}

function formatEmotionKo(emotion: string | null) {
  const labels: Record<string, string> = {
    happy: "행복한",
    normal: "보통",
    stress: "스트레스",
    tired: "피곤한",
    sad: "슬픈",
    angry: "화난"
  };

  return labels[emotion ?? "normal"] ?? "보통";
}

function formatContextKo(context: string | null) {
  const labels: Record<string, string> = {
    normal_meal: "일반 식사",
    company_dinner: "회식",
    late_night: "야식",
    delivery: "배달",
    home_meal: "집밥",
    rushed: "급하게 먹은 식사"
  };

  return labels[context ?? "normal_meal"] ?? "일반 식사";
}

function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}
