import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";
import { createMealSchema } from "@/lib/validation/meals";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("food_records")
      .select(`
        id,
        user_id,
        input_type,
        meal_type,
        emotion,
        context,
        raw_text,
        image_url,
        memo,
        eaten_at,
        created_at,
        updated_at,
        food_analysis_results (
          id,
          food_name,
          calories,
          carbohydrate_g,
          protein_g,
          fat_g,
          sugar_g,
          sodium_mg,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("eaten_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ meals: data ?? [] });
  } catch (error) {
    console.error("[meals-get]", error);
    return NextResponse.json({ error: "Failed to fetch meals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { user, error: authError } = await getAuthenticatedUser(supabase, request);

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = createMealSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("food_records")
      .insert({
        user_id: user.id,
        input_type: body.input_type,
        meal_type: body.meal_type,
        emotion: body.emotion,
        context: body.context,
        raw_text: body.raw_text,
        memo: body.memo ?? null,
        eaten_at: body.eaten_at ?? new Date().toISOString()
      })
      .select("id,user_id,input_type,meal_type,emotion,context,raw_text,image_url,memo,eaten_at,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    if (body.analysis) {
      const { error: analysisError } = await supabase
        .from("food_analysis_results")
        .insert({
          food_record_id: data.id,
          user_id: user.id,
          food_name: body.analysis.food_name,
          analysis_source: body.analysis.analysis_source ?? "gemini",
          calories: body.analysis.calories,
          carbohydrate_g: body.analysis.carbs,
          protein_g: body.analysis.protein,
          fat_g: body.analysis.fat,
          sugar_g: body.analysis.sugar,
          sodium_mg: body.analysis.sodium,
          confidence_score: 0.8,
          raw_ai_response: body.analysis
        });

      if (analysisError) {
        throw analysisError;
      }
    }

    return NextResponse.json({ meal: data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid meal input.", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("[meals-post]", error);
    return NextResponse.json({ error: "Failed to save meal." }, { status: 500 });
  }
}
