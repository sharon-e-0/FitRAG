import { createHash } from "node:crypto";
import { EMBEDDING_MODEL, embedText, toPgVector } from "@/lib/ai/embedding";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import type { FoodAnalysisForEmbedding, FoodRecordForEmbedding } from "@/types/rag";

export class FoodRecordEmbeddingService {
  constructor(private readonly ragRepository: RagDocumentRepository) {}

  async embedAndStore(foodRecordId: string, userId: string) {
    const { foodRecord, analysisResults } =
      await this.ragRepository.findFoodRecordForEmbedding(foodRecordId, userId);

    const content = buildFoodRecordDocument(foodRecord, analysisResults);
    const embedding = await embedText(content, "RETRIEVAL_DOCUMENT");

    return this.ragRepository.upsertDocument({
      user_id: userId,
      source_type: "food_record",
      source_id: foodRecord.id,
      title: buildFoodRecordTitle(foodRecord, analysisResults),
      content,
      metadata: {
        meal_type: foodRecord.meal_type,
        emotion: foodRecord.emotion,
        context: foodRecord.context,
        input_type: foodRecord.input_type,
        eaten_at: foodRecord.eaten_at,
        food_names: analysisResults.map((result) => result.food_name)
      },
      embedding: toPgVector(embedding),
      embedding_model: EMBEDDING_MODEL,
      content_hash: hashContent(content)
    });
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
  const foodText = foodRecord.raw_text ?? "식사 내용 미입력";
  const analysisText = analysisResults.length
    ? analysisResults.map(formatAnalysisResultKo).join("\n")
    : `${foodText} 섭취. 영양 분석 결과는 아직 없음.`;
  const memoText = foodRecord.memo ? `메모: ${foodRecord.memo}` : "메모: 없음";

  return [
    `${date} ${mealLabel}.`,
    `${emotionLabel} 상태.`,
    `${contextLabel} 상황.`,
    analysisText,
    memoText
  ].join("\n");
}

function formatAnalysisResultKo(result: FoodAnalysisForEmbedding) {
  return [
    `${result.food_name} ${formatNumber(result.calories)}kcal 섭취.`,
    `탄수화물 ${formatNumber(result.carbohydrate_g)}g.`,
    `단백질 ${formatNumber(result.protein_g)}g.`,
    `지방 ${formatNumber(result.fat_g)}g.`,
    `당 ${formatNumber(result.sugar_g)}g.`,
    `나트륨 ${formatNumber(result.sodium_mg)}mg.`,
    result.serving_description ? `분량: ${result.serving_description}.` : null
  ]
    .filter(Boolean)
    .join(" ");
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
