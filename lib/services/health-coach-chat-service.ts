import { generateHealthCoachAnswer } from "@/lib/ai/health-coach";
import { ChatRepository } from "@/lib/repositories/chat-repository";
import { buildHealthCoachPrompt } from "@/lib/rag/health-coach-prompt";
import { RetrievalService } from "@/lib/services/retrieval-service";
import type { RagSourceType } from "@/types/rag";

export class HealthCoachChatService {
  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly chatRepository: ChatRepository
  ) {}

  async ask(params: {
    userId: string;
    question: string;
    sessionId?: string;
    topK?: number;
    threshold?: number;
    sourceType?: RagSourceType;
  }) {
    const session = await this.chatRepository.getOrCreateSession({
      userId: params.userId,
      sessionId: params.sessionId,
      title: createSessionTitle(params.question)
    });

    const retrieval = await this.retrievalService.retrieve({
      userId: params.userId,
      query: params.question,
      topK: params.topK,
      threshold: params.threshold,
      sourceType: params.sourceType
    });

    const prompt = buildHealthCoachPrompt({
      question: params.question,
      retrievedDocuments: retrieval.documents
    });

    await this.chatRepository.createMessage({
      sessionId: session.id,
      userId: params.userId,
      role: "user",
      content: params.question
    });

    const generated = await generateHealthCoachAnswer(prompt);
    const retrievedDocumentIds = retrieval.documents.map((document) => document.id);

    const assistantMessage = await this.chatRepository.createMessage({
      sessionId: session.id,
      userId: params.userId,
      role: "assistant",
      content: generated.answer,
      retrievedDocumentIds,
      aiModel: generated.model,
      tokenUsage: generated.usageMetadata
    });

    return {
      session,
      message: assistantMessage,
      answer: generated.answer,
      retrieved_documents: retrieval.documents,
      prompt
    };
  }
}

function createSessionTitle(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ");

  if (normalized.length <= 32) {
    return normalized;
  }

  return `${normalized.slice(0, 32)}...`;
}
