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
  const analysisText = analysisResults.length
    ? analysisResults.map(formatAnalysisResult).join("\n")
    : "No AI nutrition analysis is attached yet.";

  return `
Food record
Date: ${foodRecord.eaten_at}
Meal type: ${foodRecord.meal_type ?? "unknown"}
Input type: ${foodRecord.input_type}
User text: ${foodRecord.raw_text ?? "none"}
Memo: ${foodRecord.memo ?? "none"}
Image attached: ${foodRecord.image_url ? "yes" : "no"}

Nutrition analysis:
${analysisText}
`.trim();
}

function formatAnalysisResult(result: FoodAnalysisForEmbedding) {
  return [
    `Food: ${result.food_name}`,
    result.serving_description ? `Serving: ${result.serving_description}` : null,
    `Calories: ${formatNumber(result.calories)} kcal`,
    `Carbs: ${formatNumber(result.carbohydrate_g)} g`,
    `Protein: ${formatNumber(result.protein_g)} g`,
    `Fat: ${formatNumber(result.fat_g)} g`,
    `Sugar: ${formatNumber(result.sugar_g)} g`,
    `Sodium: ${formatNumber(result.sodium_mg)} mg`
  ]
    .filter(Boolean)
    .join(", ");
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

function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}
