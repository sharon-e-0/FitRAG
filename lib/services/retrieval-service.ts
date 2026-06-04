import { RagSearchService } from "@/lib/services/rag-search-service";
import type { RagSearchResult, RagSourceType } from "@/types/rag";

export type RetrievalResult = {
  query: string;
  topK: number;
  documents: RagSearchResult[];
};

export class RetrievalService {
  constructor(private readonly ragSearchService: RagSearchService) {}

  async retrieve(params: {
    userId: string;
    query: string;
    topK?: number;
    threshold?: number;
    sourceType?: RagSourceType;
  }): Promise<RetrievalResult> {
    const topK = params.topK ?? 8;
    const documents = await this.ragSearchService.search({
      userId: params.userId,
      query: params.query,
      matchCount: topK,
      threshold: params.threshold ?? 0.2,
      sourceType: params.sourceType
    });

    return {
      query: params.query,
      topK,
      documents
    };
  }
}
