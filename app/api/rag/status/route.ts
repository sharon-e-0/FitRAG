import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecentDocument = {
  id: string;
  embedding: string | null;
};

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalDocuments,
      embeddedDocuments,
      missingEmbeddings,
      recentDocuments,
      recentFailures
    ] = await Promise.all([
      countDocuments(supabase, user.id),
      countDocuments(supabase, user.id, "embedded"),
      countDocuments(supabase, user.id, "missing"),
      getRecentDocuments(supabase, user.id),
      getRecentFailures(supabase, user.id)
    ]);
    const recentEmbedded = recentDocuments.filter((document) => document.embedding).length;
    const recentMissing = recentDocuments.length - recentEmbedded;

    return NextResponse.json({
      total_documents: totalDocuments,
      embedded_documents: embeddedDocuments,
      missing_embeddings: missingEmbeddings,
      embedding_rate:
        totalDocuments === 0 ? 0 : roundRate((embeddedDocuments / totalDocuments) * 100),
      recent_50: {
        total_documents: recentDocuments.length,
        embedded_documents: recentEmbedded,
        missing_embeddings: recentMissing
      },
      recent_failures: recentFailures
    });
  } catch (error) {
    console.error("[rag-status]", error);
    return NextResponse.json(
      { error: "Failed to inspect RAG document status." },
      { status: 500 }
    );
  }
}

async function countDocuments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  mode?: "embedded" | "missing"
) {
  let query = supabase
    .from("rag_documents")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("user_id", userId);

  if (mode === "embedded") {
    query = query.not("embedding", "is", null);
  }

  if (mode === "missing") {
    query = query.is("embedding", null);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getRecentDocuments(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("rag_documents")
    .select("id,embedding")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as RecentDocument[];
}

async function getRecentFailures(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("embedding_failure_logs")
    .select("id,food_record_id,reason,error_message,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.warn("[rag-status-failures]", error);
    return [];
  }

  return data ?? [];
}

function roundRate(value: number) {
  return Math.round(value * 10) / 10;
}
