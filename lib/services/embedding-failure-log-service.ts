import type { SupabaseClient } from "@supabase/supabase-js";

export type EmbeddingFailureReason =
  | "Gemini API Error"
  | "Timeout"
  | "Rate Limit"
  | "Invalid Content"
  | "Database Error"
  | "Unknown";

export async function logEmbeddingFailure(
  supabase: SupabaseClient,
  params: {
    userId: string;
    foodRecordId?: string | null;
    error: unknown;
  }
) {
  const reason = classifyEmbeddingFailure(params.error);
  const message =
    params.error instanceof Error ? params.error.message : "Unknown embedding error.";

  const { error } = await supabase.from("embedding_failure_logs").insert({
    user_id: params.userId,
    food_record_id: params.foodRecordId ?? null,
    reason,
    error_message: message,
    error_details: serializeError(params.error)
  });

  if (error) {
    console.warn("[embedding-failure-log]", error);
  }
}

export function classifyEmbeddingFailure(error: unknown): EmbeddingFailureReason {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("rate") ||
    normalized.includes("quota") ||
    normalized.includes("429")
  ) {
    return "Rate Limit";
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("abort")
  ) {
    return "Timeout";
  }

  if (
    normalized.includes("empty") ||
    normalized.includes("invalid content") ||
    normalized.includes("embedding text cannot be empty")
  ) {
    return "Invalid Content";
  }

  if (
    normalized.includes("gemini") ||
    normalized.includes("google") ||
    normalized.includes("api key") ||
    normalized.includes("generative")
  ) {
    return "Gemini API Error";
  }

  if (
    normalized.includes("database") ||
    normalized.includes("supabase") ||
    normalized.includes("postgres") ||
    normalized.includes("violates") ||
    normalized.includes("schema")
  ) {
    return "Database Error";
  }

  return "Unknown";
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error)
  };
}
