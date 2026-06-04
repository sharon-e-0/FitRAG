import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import { logEmbeddingFailure } from "@/lib/services/embedding-failure-log-service";
import { FoodRecordEmbeddingService } from "@/lib/services/food-record-embedding-service";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { reEmbedFoodRecordsSchema } from "@/lib/validation/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  let userId: string | null = null;

  try {
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
    const body = reEmbedFoodRecordsSchema.parse(await request.json());
    const foodRecordIds = Array.from(new Set(body.food_record_ids));
    const repository = new RagDocumentRepository(supabase);
    const service = new FoodRecordEmbeddingService(repository);
    const results = await service.reEmbed(foodRecordIds, user.id);

    return NextResponse.json({
      requested_count: body.food_record_ids.length,
      processed_count: foodRecordIds.length,
      results
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[rag-food-record-re-embed]", error);

    if (userId) {
      await logEmbeddingFailure(supabase, {
        userId,
        foodRecordId: null,
        error
      });
    }

    return NextResponse.json(
      { error: "Failed to re-embed food records." },
      { status: 500 }
    );
  }
}
