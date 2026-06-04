import type { Json } from "@/types/database";

export type RagSourceType =
  | "food_record"
  | "food_analysis"
  | "emotion"
  | "situation"
  | "health_connect"
  | "weight_log"
  | "weight_prediction"
  | "chat_message"
  | "summary";

export type RagDocument = {
  id: string;
  user_id: string;
  source_type: RagSourceType;
  source_id: string | null;
  title: string | null;
  content: string;
  metadata: Json;
  embedding_model: string;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type RagDocumentInsert = {
  user_id: string;
  source_type: RagSourceType;
  source_id?: string;
  title?: string;
  content: string;
  metadata?: Json;
  embedding: string;
  embedding_model: string;
  content_hash: string;
};

export type RagSearchResult = {
  id: string;
  user_id: string;
  source_type: RagSourceType;
  source_id: string | null;
  title: string | null;
  content: string;
  metadata: Json;
  similarity: number;
  created_at: string;
};

export type FoodRecordForEmbedding = {
  id: string;
  user_id: string;
  input_type: string;
  meal_type: string | null;
  raw_text: string | null;
  image_url: string | null;
  memo: string | null;
  eaten_at: string;
  created_at: string;
};

export type FoodAnalysisForEmbedding = {
  food_name: string;
  serving_description: string | null;
  calories: number | null;
  carbohydrate_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
};
