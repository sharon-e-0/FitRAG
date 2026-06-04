import { embedText, toPgVector } from "@/lib/ai/embedding";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import type { RagSourceType } from "@/types/rag";

export class RagSearchService {
  constructor(private readonly ragRepository: RagDocumentRepository) {}

  async search(params: {
    userId: string;
    query: string;
    matchCount?: number;
    threshold?: number;
    sourceType?: RagSourceType;
  }) {
    const embedding = await embedText(params.query, "RETRIEVAL_QUERY");

    return this.ragRepository.searchSimilar({
      userId: params.userId,
      embedding: toPgVector(embedding),
      matchCount: params.matchCount,
      threshold: params.threshold,
      sourceType: params.sourceType
    });
  }
}
