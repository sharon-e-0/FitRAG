import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RagDocumentRepository } from "@/lib/repositories/rag-document-repository";
import { RagSearchService } from "@/lib/services/rag-search-service";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { ragSearchSchema } from "@/lib/validation/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = ragSearchSchema.parse(await request.json());
    const repository = new RagDocumentRepository(supabase);
    const service = new RagSearchService(repository);
    const matches = await service.search({
      userId: user.id,
      query: body.query,
      matchCount: body.match_count,
      threshold: body.threshold,
      sourceType: body.source_type
    });

    return NextResponse.json({
      matches
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[rag-search]", error);

    return NextResponse.json(
      { error: "Failed to search RAG documents." },
      { status: 500 }
    );
  }
}
