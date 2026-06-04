import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { createWeightLogSchema } from "@/lib/validation/weight-logs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("weight_logs")
      .select("id,user_id,weight_kg,memo,logged_date,created_at,updated_at")
      .eq("user_id", user.id)
      .order("logged_date", { ascending: false })
      .limit(30);

    if (error) {
      throw error;
    }

    return NextResponse.json({ weight_logs: data ?? [] });
  } catch (error) {
    console.error("[weight-logs-get]", error);
    return NextResponse.json(
      { error: "Failed to fetch weight logs." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = createWeightLogSchema.parse(await request.json());
    const loggedDate = body.logged_date ?? new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("weight_logs")
      .upsert(
        {
          user_id: user.id,
          weight_kg: body.weight_kg,
          logged_date: loggedDate,
          memo: body.memo ?? null
        },
        { onConflict: "user_id,logged_date" }
      )
      .select("id,user_id,weight_kg,memo,logged_date,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ weight_log: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid weight log input.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[weight-logs-post]", error);
    return NextResponse.json(
      { error: "Failed to save weight log." },
      { status: 500 }
    );
  }
}
