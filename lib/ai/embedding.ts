import { createGeminiClient } from "@/lib/ai/gemini";

export const EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMENSIONS = 768;

export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export async function embedText(text: string, taskType: EmbeddingTaskType) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("Embedding text cannot be empty.");
  }

  const ai = createGeminiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: normalizedText,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS
    }
  });

  const values = response.embeddings?.[0]?.values;

  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Gemini returned an invalid embedding.");
  }

  return values;
}

export function toPgVector(embedding: number[]) {
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding must have ${EMBEDDING_DIMENSIONS} dimensions.`);
  }

  return `[${embedding.join(",")}]`;
}
