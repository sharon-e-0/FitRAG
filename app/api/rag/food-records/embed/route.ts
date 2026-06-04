import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import { FoodRecordEmbeddingService } from "@/lib/services/food-record-embedding-service";
import { createClient } from "@/lib/supabase/server";
import { embedFoodRecordSchema } from "@/lib/validation/rag";

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

    const body = embedFoodRecordSchema.parse(await request.json());
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

    return NextResponse.json(
      { error: "Failed to embed food record." },
      { status: 500 }
    );
  }
}
