import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ChatRepository } from "@/lib/repositories/chat-repository";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import { HealthCoachChatService } from "@/lib/services/health-coach-chat-service";
import { RagSearchService } from "@/lib/services/rag-search-service";
import { RetrievalService } from "@/lib/services/retrieval-service";
import { createClient } from "@/lib/supabase/server";
import { healthCoachQuestionSchema } from "@/lib/validation/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = healthCoachQuestionSchema.parse(await request.json());
    const ragRepository = new RagDocumentRepository(supabase);
    const chatRepository = new ChatRepository(supabase);
    const ragSearchService = new RagSearchService(ragRepository);
    const retrievalService = new RetrievalService(ragSearchService);
    const chatService = new HealthCoachChatService(retrievalService, chatRepository);

    const result = await chatService.ask({
      userId: user.id,
      question: body.question,
      sessionId: body.session_id,
      topK: body.top_k,
      threshold: body.threshold,
      sourceType: body.source_type
    });

    return NextResponse.json({
      session_id: result.session.id,
      message_id: result.message.id,
      answer: result.answer,
      retrieved_documents: result.retrieved_documents,
      ...(body.include_prompt ? { prompt: result.prompt } : {})
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[rag-coach]", error);

    return NextResponse.json(
      { error: "Failed to generate health coaching answer." },
      { status: 500 }
    );
  }
}
