import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FoodAnalysisForEmbedding,
  FoodRecordForEmbedding,
  RagDocument,
  RagDocumentInsert,
  RagSearchResult,
  RagSourceType
} from "@/types/rag";

export class RagDocumentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findFoodRecordForEmbedding(foodRecordId: string, userId: string) {
    const { data: foodRecord, error: foodRecordError } = await this.supabase
      .from("food_records")
      .select("id,user_id,input_type,meal_type,raw_text,image_url,memo,eaten_at,created_at")
      .eq("id", foodRecordId)
      .eq("user_id", userId)
      .single<FoodRecordForEmbedding>();

    if (foodRecordError) {
      throw foodRecordError;
    }

    const { data: analysisResults, error: analysisError } = await this.supabase
      .from("food_analysis_results")
      .select("food_name,serving_description,calories,carbohydrate_g,protein_g,fat_g,sugar_g,sodium_mg")
      .eq("food_record_id", foodRecordId)
      .eq("user_id", userId)
      .returns<FoodAnalysisForEmbedding[]>();

    if (analysisError) {
      throw analysisError;
    }

    return {
      foodRecord,
      analysisResults: analysisResults ?? []
    };
  }

  async upsertDocument(document: RagDocumentInsert) {
    const { data, error } = await this.supabase
      .from("rag_documents")
      .upsert(document, {
        onConflict: "user_id,source_type,source_id"
      })
      .select("id,user_id,source_type,source_id,title,content,metadata,embedding_model,content_hash,created_at,updated_at")
      .single<RagDocument>();

    if (error) {
      throw error;
    }

    return data;
  }

  async searchSimilar(params: {
    userId: string;
    embedding: string;
    matchCount?: number;
    threshold?: number;
    sourceType?: RagSourceType;
  }) {
    const { data, error } = await this.supabase.rpc("match_rag_documents", {
      query_embedding: params.embedding,
      match_user_id: params.userId,
      match_count: params.matchCount ?? 8,
      match_threshold: params.threshold ?? 0.2,
      match_source_type: params.sourceType ?? null
    });

    if (error) {
      throw error;
    }

    return (data ?? []) as RagSearchResult[];
  }
}
