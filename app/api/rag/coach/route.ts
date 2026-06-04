import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateHealthCoachAnswer } from "@/lib/ai/health-coach";
import { ChatRepository } from "@/lib/repositories/chat-repository";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import { buildHealthCoachPrompt } from "@/lib/rag/health-coach-prompt";
import { RagSearchService } from "@/lib/services/rag-search-service";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { healthCoachQuestionSchema } from "@/lib/validation/rag";
import type { FoodRecord } from "@/types/database";
import type { RagSearchResult } from "@/types/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = healthCoachQuestionSchema.parse(await request.json());
    const ragRepository = new RagDocumentRepository(supabase);
    const chatRepository = new ChatRepository(supabase);
    const ragSearchService = new RagSearchService(ragRepository);
    const session = await chatRepository.getOrCreateSession({
      userId: user.id,
      sessionId: body.session_id,
      title: createSessionTitle(body.question)
    });

    await chatRepository.createMessage({
      sessionId: session.id,
      userId: user.id,
      role: "user",
      content: body.question
    });

    const retrievedDocuments = await getCoachContext({
      userId: user.id,
      query: body.question,
      topK: body.top_k,
      threshold: body.threshold,
      sourceType: body.source_type,
      ragSearchService,
      supabase
    });
    const prompt = buildHealthCoachPrompt({
      question: body.question,
      retrievedDocuments
    });
    const generated = await generateCoachAnswerWithFallback({
      prompt,
      question: body.question,
      retrievedDocuments
    });
    const message = await chatRepository.createMessage({
      sessionId: session.id,
      userId: user.id,
      role: "assistant",
      content: generated.answer,
      retrievedDocumentIds: retrievedDocuments
        .map((document) => document.id)
        .filter((id) => isUuid(id)),
      aiModel: generated.model,
      tokenUsage: generated.usageMetadata
    });

    return NextResponse.json({
      session_id: session.id,
      message_id: message.id,
      answer: generated.answer,
      retrieved_documents: retrievedDocuments,
      ...(body.include_prompt ? { prompt } : {})
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

async function getCoachContext(params: {
  userId: string;
  query: string;
  topK?: number;
  threshold?: number;
  sourceType?: Parameters<RagSearchService["search"]>[0]["sourceType"];
  ragSearchService: RagSearchService;
  supabase: ReturnType<typeof createClient>;
}) {
  try {
    const documents = await params.ragSearchService.search({
      userId: params.userId,
      query: params.query,
      matchCount: params.topK ?? 8,
      threshold: params.threshold ?? 0.2,
      sourceType: params.sourceType
    });

    if (documents.length > 0) {
      return documents;
    }
  } catch (error) {
    console.warn("[rag-coach-search-fallback]", error);
  }

  return getRecentMealDocuments(params.supabase, params.userId, params.topK ?? 8);
}

async function getRecentMealDocuments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  limit: number
): Promise<RagSearchResult[]> {
  const { data, error } = await supabase
    .from("food_records")
    .select("id,user_id,input_type,meal_type,raw_text,image_url,memo,eaten_at,created_at,updated_at")
    .eq("user_id", userId)
    .order("eaten_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as FoodRecord[]).map((record) => ({
    id: record.id,
    user_id: record.user_id,
    source_type: "food_record",
    source_id: record.id,
    title: `${record.meal_type ?? "Meal"} record`,
    content: [
      `Date: ${record.eaten_at}`,
      `Meal type: ${record.meal_type ?? "unknown"}`,
      `Input type: ${record.input_type}`,
      `User text: ${record.raw_text ?? "none"}`,
      record.memo ? `Memo: ${record.memo}` : null
    ]
      .filter(Boolean)
      .join("\n"),
    metadata: {
      fallback_context: true,
      meal_type: record.meal_type,
      eaten_at: record.eaten_at
    },
    similarity: 1,
    created_at: record.created_at
  }));
}

async function generateCoachAnswerWithFallback(params: {
  prompt: string;
  question: string;
  retrievedDocuments: RagSearchResult[];
}) {
  try {
    return await generateHealthCoachAnswer(params.prompt);
  } catch (error) {
    console.warn("[rag-coach-answer-fallback]", error);

    return {
      answer: buildRuleBasedCoachAnswer(params.question, params.retrievedDocuments),
      model: "rule-based-fallback",
      usageMetadata: undefined
    };
  }
}

function buildRuleBasedCoachAnswer(
  question: string,
  retrievedDocuments: RagSearchResult[]
) {
  if (retrievedDocuments.length === 0) {
    return [
      "1. 현재 상태 요약",
      "아직 저장된 개인 식사 기록이 충분하지 않습니다.",
      "",
      "2. 기록 기반 근거",
      "검색 가능한 식사, 영양, 감정, 활동 기록이 없습니다.",
      "",
      "3. 개인화 코칭",
      "먼저 식사 기록을 2~3개 저장한 뒤 다시 질문하면 더 개인화된 답변을 줄 수 있습니다.",
      "",
      "4. 오늘 할 일",
      "오늘 먹은 식사와 당시 기분을 한 줄로 저장해 주세요."
    ].join("\n");
  }

  const mealLines = retrievedDocuments
    .slice(0, 5)
    .map((document, index) => `${index + 1}. ${document.content.replace(/\n/g, " / ")}`);

  return [
    "1. 현재 상태 요약",
    `질문: ${question}`,
    "최근 저장된 식사 기록을 기준으로 보면, 아직 영양 분석 데이터는 부족하지만 식사 텍스트 기록은 확인됩니다.",
    "",
    "2. 기록 기반 근거",
    ...mealLines,
    "",
    "3. 개인화 코칭",
    "현재 기록만으로는 칼로리나 탄단지 균형을 확정하기 어렵습니다. 그래도 같은 식사가 반복된다면 단백질 식품, 채소, 탄수화물 양을 함께 기록하면 다음 코칭 정확도가 올라갑니다.",
    "",
    "4. 오늘 할 일",
    "다음 식사 저장 시 음식명, 대략적인 양, 기분 상태를 함께 적어 주세요."
  ].join("\n");
}

function createSessionTitle(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ");

  if (normalized.length <= 32) {
    return normalized;
  }

  return `${normalized.slice(0, 32)}...`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
