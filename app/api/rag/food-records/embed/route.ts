import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import { logEmbeddingFailure } from "@/lib/services/embedding-failure-log-service";
import { FoodRecordEmbeddingService } from "@/lib/services/food-record-embedding-service";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { embedFoodRecordSchema } from "@/lib/validation/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  let userId: string | null = null;
  let foodRecordId: string | null = null;

  try {
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
    const body = embedFoodRecordSchema.parse(await request.json());
    foodRecordId = body.food_record_id;
    const repository = new RagDocumentRepository(supabase);
    const service = new FoodRecordEmbeddingService(repository);
    const document = await service.embedAndStore(body.food_record_id, user.id);

    return NextResponse.json({
      document
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[rag-food-record-embed]", error);

    if (userId) {
      await logEmbeddingFailure(supabase, {
        userId,
        foodRecordId,
        error
      });
    }

    return NextResponse.json(
      { error: "Failed to embed food record." },
      { status: 500 }
    );
  }
}
