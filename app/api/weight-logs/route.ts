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

    const today = new Date().toISOString().slice(0, 10);
    const [weightResult, activityResult] = await Promise.all([
      supabase
        .from("weight_logs")
        .select("id,user_id,weight_kg,memo,logged_date,created_at,updated_at")
        .eq("user_id", user.id)
        .order("logged_date", { ascending: false })
        .limit(30),
      supabase
        .from("health_connect_daily_summaries")
        .select("id,user_id,summary_date,steps,active_calories,total_calories_burned,exercise_minutes,source,created_at,updated_at")
        .eq("user_id", user.id)
        .eq("summary_date", today)
        .maybeSingle()
    ]);

    if (weightResult.error) {
      throw weightResult.error;
    }

    if (activityResult.error) {
      throw activityResult.error;
    }

    return NextResponse.json({
      weight_logs: weightResult.data ?? [],
      today_activity_summary: activityResult.data ?? null
    });
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

    const [weightResult, activityResult] = await Promise.all([
      body.weight_kg === undefined
        ? Promise.resolve({ data: null, error: null })
        : supabase
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
            .single(),
      body.active_calories === undefined
        ? Promise.resolve({ data: null, error: null })
        : supabase
            .from("health_connect_daily_summaries")
            .upsert(
              {
                user_id: user.id,
                summary_date: loggedDate,
                active_calories: body.active_calories,
                source: "manual"
              },
              { onConflict: "user_id,summary_date" }
            )
            .select("id,user_id,summary_date,steps,active_calories,total_calories_burned,exercise_minutes,source,created_at,updated_at")
            .single()
    ]);

    if (weightResult.error) {
      throw weightResult.error;
    }

    if (activityResult.error) {
      throw activityResult.error;
    }

    return NextResponse.json(
      {
        weight_log: weightResult.data,
        today_activity_summary: activityResult.data
      },
      { status: 201 }
    );
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
